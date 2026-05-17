import "./load-dotenv";

/**
 * Lagani uvoz iz žive WordPress MySQL baze: samo `wp_posts` + `wp_postmeta`.
 * Ne prebacuje WP šemu u ciljnu bazu — upisuje u `site_pages` / `site_page_translations` i `media`.
 *
 * Putanje slika: `media.storage_key` = `uploads/<_wp_attached_file>` (npr. `uploads/2024/05/foto.jpg`).
 * Fizičke fajlove kopiraj iz WP `wp-content/uploads/` u `public/uploads/` (ista relativna struktura).
 *
 * ## Pokretanje
 * ```bash
 * npm run sync:wp-pages-media -- --dry-run
 * npm run sync:wp-pages-media
 * ```
 *
 * ## .env (kao ETL)
 * - `DATABASE_URL` ili MYSQL_* — ciljna baza
 * - `WP_DATABASE_URL` ili WP_MYSQL_* — izvorna WP baza
 * - `WP_TABLE_PREFIX` (default `wp_`)
 * - `MIGRATE_OLD_UPLOADS_PREFIX`, `MIGRATE_NEW_UPLOADS_PREFIX`, `MIGRATE_OLD_SITE_ORIGIN` — za čišćenje HTML stranica
 *
 * Opciono:
 * - `SYNC_WP_SKIP_PAGE_SLUGS=naslovna,privatna` (zarezom; default i ovako preskače `naslovna`)
 */
import { createHash, randomUUID } from "crypto";
import path from "path";

import { and, eq } from "drizzle-orm";
import type { RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

import { db } from "../lib/db";
import {
  media,
  mediaAltTranslations,
  sitePages,
  sitePageTranslations,
} from "../lib/db/schema";
import { getWpSourceDatabaseUrl } from "../lib/database-url";
import { createMysqlPoolUtf8mb4 } from "../lib/create-mysql-pool";
import type { Locale } from "../lib/i18n";
import { locales } from "../lib/i18n";
import { textOrNull, titleOrFallback } from "./lib/drizzle-text-helpers";
import { wpMaybeUnserialize } from "./lib/php-maybe-unserialize";
import {
  inferOldSiteOriginFromEnv,
  sanitizeOptionsFromEnv,
  sanitizeWordPressContent,
} from "./lib/sanitize-wordpress-content";

const dryRun =
  process.argv.includes("--dry-run") || process.env.SYNC_WP_DRY_RUN === "1";

function normalizeLabel(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableMediaId(wpAttachmentId: number): string {
  const hex = createHash("sha256")
    .update(`wp-media:${wpAttachmentId}`)
    .digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function safeUploadRelative(raw: string): string | null {
  const n = raw.replace(/\\/g, "/").replace(/^\/+/u, "").trim();
  if (!n || n.includes("..")) return null;
  return n;
}

function pathFromAttachmentGuid(guid: string): string | null {
  const g = guid.trim();
  if (!g.startsWith("http")) return null;
  try {
    const u = new URL(g);
    const mark = "/wp-content/uploads/";
    const i = u.pathname.indexOf(mark);
    if (i >= 0) {
      return safeUploadRelative(u.pathname.slice(i + mark.length));
    }
  } catch {
    return null;
  }
  return null;
}

function dimsFromWpMetadata(metaSerialized: string | undefined): {
  width: number | null;
  height: number | null;
  filesize: number;
} {
  if (!metaSerialized) return { width: null, height: null, filesize: 0 };
  const u = wpMaybeUnserialize(metaSerialized);
  if (!u || typeof u !== "object") return { width: null, height: null, filesize: 0 };
  const o = u as Record<string, unknown>;
  const width = Number(o.width);
  const height = Number(o.height);
  const filesize = Number(o.filesize);
  return {
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    filesize: Number.isFinite(filesize) ? filesize : 0,
  };
}

function buildMetaMap(
  rows: { post_id: number; meta_key: string; meta_value: string }[],
): Map<number, Record<string, string>> {
  const map = new Map<number, Record<string, string>>();
  for (const row of rows) {
    const pid = row.post_id;
    if (!Number.isFinite(pid)) continue;
    const rec = map.get(pid) ?? {};
    rec[row.meta_key] = row.meta_value ?? "";
    map.set(pid, rec);
  }
  return map;
}

async function loadPostmetaForIds(
  wpPool: Pool,
  metaTable: string,
  ids: number[],
): Promise<Map<number, Record<string, string>>> {
  const map = new Map<number, Record<string, string>>();
  const batch = 300;
  for (let i = 0; i < ids.length; i += batch) {
    const slice = ids.slice(i, i + batch);
    if (slice.length === 0) continue;
    const ph = slice.map(() => "?").join(",");
    const [rows] = await wpPool.query<RowDataPacket[]>(
      `SELECT post_id, meta_key, meta_value FROM \`${metaTable}\` WHERE post_id IN (${ph})`,
      slice,
    );
    const merged = buildMetaMap(
      rows as { post_id: number; meta_key: string; meta_value: string }[],
    );
    for (const [k, v] of merged) map.set(k, v);
  }
  return map;
}

type WpPageRow = {
  ID: number;
  post_title: string;
  post_content: string;
  post_name: string;
  post_modified: Date;
  post_date: Date;
};

type WpAttRow = {
  ID: number;
  post_title: string;
  post_name: string;
  guid: string;
  post_mime_type: string;
  post_modified: Date;
};

function parseSkipSlugs(): Set<string> {
  const extra = (process.env.SYNC_WP_SKIP_PAGE_SLUGS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(["naslovna", ...extra]);
}

async function main(): Promise<void> {
  const prefix = (process.env.WP_TABLE_PREFIX ?? "wp_").replace(/[^a-z0-9_]/gi, "");
  const postsTable = `${prefix}posts`;
  const metaTable = `${prefix}postmeta`;
  const skipSlugs = parseSkipSlugs();

  const sanitizeOpts = {
    ...sanitizeOptionsFromEnv(),
    oldSiteOrigin:
      process.env.MIGRATE_OLD_SITE_ORIGIN?.trim().replace(/\/+$/, "") ||
      inferOldSiteOriginFromEnv(),
  };

  const wpPool = createMysqlPoolUtf8mb4(getWpSourceDatabaseUrl());
  const targetLocales = locales as readonly Locale[];

  try {
    const [pageRows] = await wpPool.query<WpPageRow[] & RowDataPacket[]>(
      `SELECT ID, post_title, post_content, post_name, post_modified, post_date
       FROM \`${postsTable}\`
       WHERE post_type = 'page' AND post_status = 'publish'
       ORDER BY ID ASC`,
    );

    const pages = (pageRows as unknown as WpPageRow[]).filter((p) => {
      const slug = (p.post_name ?? "").trim();
      if (!slug || skipSlugs.has(slug)) return false;
      return true;
    });

    const [attRows] = await wpPool.query<WpAttRow[] & RowDataPacket[]>(
      `SELECT ID, post_title, post_name, guid, post_mime_type, post_modified
       FROM \`${postsTable}\`
       WHERE post_type = 'attachment' AND post_mime_type LIKE 'image/%'
       ORDER BY ID ASC`,
    );
    const attachments = attRows as unknown as WpAttRow[];

    const pageIds = pages.map((p) => p.ID);
    const attIds = attachments.map((a) => a.ID);
    const metaByPost = await loadPostmetaForIds(wpPool, metaTable, [
      ...pageIds,
      ...attIds,
    ]);

    let pagesUpserted = 0;
    let mediaUpserted = 0;
    let mediaSkipped = 0;

    for (const pg of pages) {
      const slug = pg.post_name.trim().slice(0, 255);
      let bodyHtml = sanitizeWordPressContent(pg.post_content ?? "", {
        ...sanitizeOpts,
        contentKind: "html",
      });
      const titlePlain = titleOrFallback(
        normalizeLabel(
          sanitizeWordPressContent(pg.post_title ?? "", {
            ...sanitizeOpts,
            contentKind: "plain",
          }),
        ),
        slug,
      ).slice(0, 500);

      const existing = await db
        .select({ id: sitePages.id })
        .from(sitePages)
        .where(eq(sitePages.slug, slug))
        .limit(1);
      const pageId = existing[0]?.id ?? randomUUID();

      if (dryRun) {
        console.log(
          `[dry-run] page slug=${slug} ${existing[0] ? "UPDATE" : "INSERT"} title=${titlePlain.slice(0, 60)}…`,
        );
        pagesUpserted++;
        continue;
      }

      if (existing[0]) {
        await db
          .update(sitePages)
          .set({
            published: true,
            updatedAt:
              pg.post_modified instanceof Date
                ? pg.post_modified
                : new Date(pg.post_modified as unknown as string),
          })
          .where(eq(sitePages.id, pageId));
      } else {
        await db.insert(sitePages).values({
          id: pageId,
          slug,
          published: true,
          createdAt:
            pg.post_date instanceof Date
              ? pg.post_date
              : new Date(pg.post_date as unknown as string),
          updatedAt:
            pg.post_modified instanceof Date
              ? pg.post_modified
              : new Date(pg.post_modified as unknown as string),
        });
      }

      for (const loc of targetLocales) {
        const tr = await db
          .select({ id: sitePageTranslations.id })
          .from(sitePageTranslations)
          .where(
            and(
              eq(sitePageTranslations.pageId, pageId),
              eq(sitePageTranslations.locale, loc),
            ),
          )
          .limit(1);
        if (tr[0]) {
          await db
            .update(sitePageTranslations)
            .set({
              title: titlePlain,
              body: textOrNull(bodyHtml),
            })
            .where(eq(sitePageTranslations.id, tr[0].id));
        } else {
          await db.insert(sitePageTranslations).values({
            id: randomUUID(),
            pageId,
            locale: loc,
            title: titlePlain,
            body: textOrNull(bodyHtml),
          });
        }
      }
      pagesUpserted++;
    }

    for (const att of attachments) {
      const meta = metaByPost.get(att.ID) ?? {};
      const relRaw =
        safeUploadRelative(meta._wp_attached_file ?? "") ??
        pathFromAttachmentGuid(att.guid ?? "");
      if (!relRaw) {
        console.warn(
          `[sync] Preskačem attachment WP ID=${att.ID} (nema _wp_attached_file ni putanje u guid).`,
        );
        mediaSkipped++;
        continue;
      }

      const storageKey = path.posix.join("uploads", relRaw.replace(/^\/+/u, ""));
      const id = stableMediaId(att.ID);
      const baseName = path.posix.basename(relRaw) || `wp-${att.ID}`;
      const filename = (
        normalizeLabel(att.post_title) || baseName
      ).replace(/[^a-zA-Z0-9._\s-]+/g, "_").slice(0, 200);

      const { width, height, filesize } = dimsFromWpMetadata(
        meta._wp_attachment_metadata,
      );
      const sizeBytes = filesize > 0 ? Math.min(filesize, 2_147_483_647) : 0;

      const altRaw = (meta._wp_attachment_image_alt ?? "").trim();
      const altSan =
        altRaw.length > 0
          ? sanitizeWordPressContent(altRaw, {
              ...sanitizeOpts,
              contentKind: "plain",
            }).slice(0, 512)
          : "";

      if (dryRun) {
        console.log(
          `[dry-run] media wp=${att.ID} storageKey=${storageKey} mime=${att.post_mime_type}`,
        );
        mediaUpserted++;
        continue;
      }

      const [already] = await db
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, id))
        .limit(1);

      const mimeType = (att.post_mime_type || "image/jpeg").slice(0, 128);

      if (already) {
        await db
          .update(media)
          .set({
            filename,
            storageKey,
            mimeType,
            sizeBytes,
            width,
            height,
            altText: altSan.length > 0 ? altSan : null,
          })
          .where(eq(media.id, id));
      } else {
        await db.insert(media).values({
          id,
          filename,
          storageKey,
          mimeType,
          sizeBytes,
          width,
          height,
          altText: altSan.length > 0 ? altSan : null,
          createdAt: new Date(),
        });
      }
      mediaUpserted++;

      for (const loc of targetLocales) {
        const tr = await db
          .select({ id: mediaAltTranslations.id })
          .from(mediaAltTranslations)
          .where(
            and(
              eq(mediaAltTranslations.mediaId, id),
              eq(mediaAltTranslations.locale, loc),
            ),
          )
          .limit(1);
        if (tr[0]) {
          await db
            .update(mediaAltTranslations)
            .set({ altText: altSan })
            .where(eq(mediaAltTranslations.id, tr[0].id));
        } else {
          await db.insert(mediaAltTranslations).values({
            id: randomUUID(),
            mediaId: id,
            locale: loc,
            altText: altSan,
          });
        }
      }
    }

    console.log(`
========== WP sync (samo posts + postmeta) ==========
Dry-run:                        ${dryRun ? "da" : "ne"}
Stranica (ubaceno/ažurirano):  ${pagesUpserted}
Media zapisa (ubaceno/ažur.):  ${mediaUpserted}
Preskočeno medija (bez put.):  ${mediaSkipped}
Alt redova (media × jezici):   ${dryRun ? 0 : mediaUpserted * targetLocales.length}
Prvo iskopiraj fajlove iz WP wp-content/uploads u public/uploads/ (ista podstabla).
====================================================`);
  } finally {
    await wpPool.end();
  }
}

main().catch((e) => {
  console.error("[sync-wp-pages-media] Fatal:", e);
  process.exit(1);
});
