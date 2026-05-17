/**
 * ETL: živa WordPress MySQL baza → Drizzle šema (nova arhitektura, bez WP modela).
 *
 * @see lib/db/schema.ts — ciljne tabele `posts`, `post_translations`
 *
 * ## Pokretanje
 * ```bash
 * npm run migrate:wp-etl
 * ```
 *
 * ## .env (minimalno)
 * - `DATABASE_URL` ili MYSQL_* — **ciljna** baza (Next/Drizzle aplikacija)
 * - `WP_DATABASE_URL` ili `WP_MYSQL_USER` + `WP_MYSQL_PASSWORD` + `WP_MYSQL_DATABASE` — **izvorna** WP baza
 *
 * Opciono:
 * - `WP_TABLE_PREFIX` (podrazumijevano `wp_`)
 * - `MIGRATE_POST_TYPES` npr. `post` ili `post,page` (page i dalje ide u `posts` — za CMS stranice koristi `site_pages` posebno)
 * - `MIGRATE_BATCH_SIZE` (default 100)
 * - `MIGRATE_CONTENT_ROLE` = `blog` | `team`
 * - `MIGRATE_APPEND_META_JSON` = `1` — dodaje očišćena meta kao HTML komentar na kraju body-ja (debug)
 *
 * Zamjena uploads URL-a i internih linkova (vidi `sanitizeWordPressContent` u `scripts/lib/sanitize-wordpress-content.ts`):
 * - `MIGRATE_OLD_UPLOADS_PREFIX=https://stari-sajt.com/wp-content/uploads`
 * - `MIGRATE_NEW_UPLOADS_PREFIX=/uploads/` ili pun URL do S3/CDN
 * - `MIGRATE_OLD_SITE_ORIGIN=https://stari-sajt.com` — eksplicitno za `<a href>` na istom domenu (inače se pokušava izvesti iz uploads prefiksa)
 *
 * Ciljni model: **Drizzle** u `lib/db/schema.ts` (posts / post_translations) — ne Prisma.
 *
 * Enkoding: izvorna i ciljna konekcija koriste **utf8mb4** (`createMysqlPoolUtf8mb4`) radi emoji i dijakritika.
 */

import "./load-dotenv";

import { randomUUID } from "crypto";

import { drizzle } from "drizzle-orm/mysql2";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

import { getDatabaseUrl, getWpSourceDatabaseUrl } from "../lib/database-url";
import { createMysqlPoolUtf8mb4 } from "../lib/create-mysql-pool";
import * as schema from "../lib/db/schema";
import { postTranslations, posts } from "../lib/db/schema";
import type { Locale } from "../lib/i18n";
import { locales } from "../lib/i18n";
import {
  stringifyMetaForStorage,
  wpMaybeUnserialize,
} from "./lib/php-maybe-unserialize";
import {
  sanitizeWordPressContent,
  sanitizeOptionsFromEnv,
} from "./lib/sanitize-wordpress-content";
import { textOrNull, titleOrFallback } from "./lib/drizzle-text-helpers";

/** Mapiranje wp_postmeta.meta_key → polje u `post_translations` (nakon čišćenja). */
const META_TO_TRANSLATION: Partial<
  Record<string, "excerpt" | "metaTitle" | "metaDescription" | "body">
> = {
  // SEO (Yoast i slični dodaci):
  _yoast_wpseo_title: "metaTitle",
  _yoast_wpseo_metadesc: "metaDescription",
  // Svoje ACF / meta ključeve dodaj ovdje, npr.:
  // moj_podnaslov: "excerpt",
};

const contentRoleSchema = z.enum(["blog", "team"]);

type WpPostRow = {
  ID: number;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_name: string;
  post_status: string;
  post_type: string;
  post_date: Date;
  post_modified: Date;
};

/** `sanitizedBodyHtml` je već prošao kroz sanitizeWordPressContent (HTML). */
function excerptFromContent(
  sanitizedBodyHtml: string,
  excerptField: string,
): string {
  const ex = excerptField.trim();
  if (ex) return ex.replace(/<[^>]+>/g, "").trim();
  const plain = sanitizedBodyHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 400 ? `${plain.slice(0, 397)}…` : plain;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function main(): Promise<void> {
  const prefix = (process.env.WP_TABLE_PREFIX ?? "wp_").replace(/[^a-z0-9_]/gi, "");
  const batchSize = Math.max(
    1,
    Number.parseInt(process.env.MIGRATE_BATCH_SIZE ?? "100", 10) || 100,
  );
  const postTypes = (process.env.MIGRATE_POST_TYPES ?? "post")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const contentRole = contentRoleSchema.parse(
    process.env.MIGRATE_CONTENT_ROLE ?? "blog",
  );
  const appendMetaJson = process.env.MIGRATE_APPEND_META_JSON === "1";
  const sanitizeOpts = sanitizeOptionsFromEnv();

  if (postTypes.length === 0) {
    throw new Error("MIGRATE_POST_TYPES mora sadržati bar jedan post_type.");
  }

  const postsTable = `${prefix}posts`;
  const metaTable = `${prefix}postmeta`;

  const wpUrl = getWpSourceDatabaseUrl();
  const targetUrl = getDatabaseUrl();

  const wpPool = createMysqlPoolUtf8mb4(wpUrl);
  const targetPool = createMysqlPoolUtf8mb4(targetUrl);
  const db = drizzle(targetPool, { schema, mode: "default" });

  const typePlaceholders = postTypes.map(() => "?").join(",");

  const [countRows] = await wpPool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM \`${postsTable}\` WHERE post_status = 'publish' AND post_type IN (${typePlaceholders})`,
    postTypes,
  );
  const total = Number((countRows as { c: number }[])[0]?.c ?? 0);
  console.log(
    `[ETL] Izvor: ${postsTable}, tipovi: ${postTypes.join(", ")}, ukupno publish: ${total}, batch: ${batchSize}`,
  );

  const [idRows] = await wpPool.query<RowDataPacket[]>(
    `SELECT ID FROM \`${postsTable}\` WHERE post_status = 'publish' AND post_type IN (${typePlaceholders}) ORDER BY ID ASC`,
    postTypes,
  );
  const allIds = (idRows as { ID: number }[]).map((r) => r.ID);
  const batches = chunk(allIds, batchSize);

  let migrated = 0;
  let failed = 0;

  for (let b = 0; b < batches.length; b++) {
    const ids = batches[b]!;
    const idPlaceholders = ids.map(() => "?").join(",");

    const [postRows] = await wpPool.query<WpPostRow[] & RowDataPacket[]>(
      `SELECT ID, post_title, post_content, post_excerpt, post_name, post_status, post_type, post_date, post_modified
       FROM \`${postsTable}\`
       WHERE ID IN (${idPlaceholders})`,
      ids,
    );

    const [metaRows] = await wpPool.query<RowDataPacket[]>(
      `SELECT post_id, meta_key, meta_value FROM \`${metaTable}\` WHERE post_id IN (${idPlaceholders})`,
      ids,
    );

    const metaByPost = new Map<number, Map<string, string>>();
    for (const row of metaRows as { post_id: number; meta_key: string; meta_value: string }[]) {
      const pid = row.post_id;
      const key = row.meta_key;
      const val = row.meta_value ?? "";
      if (!metaByPost.has(pid)) metaByPost.set(pid, new Map());
      metaByPost.get(pid)!.set(key, val);
    }

    for (const wp of postRows as unknown as WpPostRow[]) {
      try {
        const postId = randomUUID();
        const slug = (wp.post_name || `wp-${wp.ID}`).slice(0, 255);

        const metaMap = metaByPost.get(wp.ID) ?? new Map();
        /** PHP-serijalizovane ili JSON meta vrijednosti → JS vrijednosti prije upisa / debug komentara. */
        const cleanedRecord: Record<string, unknown> = {};

        let body = sanitizeWordPressContent(wp.post_content ?? "", {
          ...sanitizeOpts,
          contentKind: "html",
        });
        const sanitizedExcerptField = sanitizeWordPressContent(
          wp.post_excerpt ?? "",
          { ...sanitizeOpts, contentKind: "plain" },
        );
        let excerpt = excerptFromContent(body, sanitizedExcerptField);
        let metaTitle: string | null = null;
        let metaDescription: string | null = null;

        for (const [mkey, rawVal] of metaMap) {
          const cleaned = wpMaybeUnserialize(rawVal);
          cleanedRecord[mkey] = cleaned;

          const target = META_TO_TRANSLATION[mkey];
          if (!target) continue;

          const asText =
            typeof cleaned === "string"
              ? sanitizeWordPressContent(cleaned, {
                  ...sanitizeOpts,
                  contentKind: target === "body" ? "html" : "plain",
                })
              : stringifyMetaForStorage(cleaned);
          const clipped = asText.slice(0, 65000);
          if (target === "excerpt") excerpt = clipped.slice(0, 65535);
          if (target === "metaTitle") metaTitle = clipped.slice(0, 255);
          if (target === "metaDescription") {
            metaDescription = clipped.slice(0, 512);
          }
          if (target === "body") {
            body = sanitizeWordPressContent(`${body}\n\n${clipped}`, {
              ...sanitizeOpts,
              contentKind: "html",
            });
          }
        }

        if (appendMetaJson) {
          body += `\n\n<!-- migrated-meta: ${wp.ID} -->\n<!-- ${JSON.stringify(cleanedRecord).slice(0, 8000)} -->\n`;
        }

        await db.transaction(async (tx) => {
          await tx.insert(posts).values({
            id: postId,
            published: true,
            publishedAt:
              wp.post_date instanceof Date
                ? wp.post_date
                : new Date(wp.post_date as unknown as string),
            contentRole,
            coverMediaId: null,
            createdAt:
              wp.post_date instanceof Date
                ? wp.post_date
                : new Date(wp.post_date as unknown as string),
            updatedAt:
              wp.post_modified instanceof Date
                ? wp.post_modified
                : new Date(wp.post_modified as unknown as string),
          });

          for (const loc of locales) {
            const titleSanitized = sanitizeWordPressContent(
              (wp.post_title || slug).slice(0, 500),
              { ...sanitizeOpts, contentKind: "plain" },
            );
            const title = titleOrFallback(titleSanitized, slug).slice(0, 500);

            const metaDescCombined =
              metaDescription ??
              (excerpt?.trim()
                ? excerpt.slice(0, 512)
                : null);

            await tx.insert(postTranslations).values({
              id: randomUUID(),
              postId,
              locale: loc as Locale,
              slug,
              title,
              excerpt: textOrNull(excerpt),
              body: textOrNull(body),
              metaTitle: textOrNull(metaTitle),
              metaDescription: textOrNull(metaDescCombined),
            });
          }
        });

        migrated++;
      } catch (e) {
        failed++;
        console.error(`[ETL] Greška na WP ID=${wp.ID}:`, e);
      }
    }

    console.log(
      `[ETL] Batch ${b + 1}/${batches.length} — migrirano ${migrated}/${total} (neuspješno redova: ${failed})`,
    );
  }

  await wpPool.end();
  await targetPool.end();

  const localeCount = locales.length;
  const postTranslationsOk = migrated * localeCount;
  console.log(`
========== WordPress ETL — završni izvještaj ==========
UTF-8: mysql2 pool sa charset utf8mb4 (createMysqlPoolUtf8mb4).
WP zapisa (publish, filtrirani tipovi):  ${total}
Uspješno ubačeno u posts:               ${migrated}
Uspješno ubačeno u post_translations: ${postTranslationsOk} (${localeCount} jez./post)
Grešaka / preskočeno (try/catch):      ${failed}
=====================================================`);
}

main().catch((e) => {
  console.error("[ETL] Fatal:", e);
  process.exit(1);
});
