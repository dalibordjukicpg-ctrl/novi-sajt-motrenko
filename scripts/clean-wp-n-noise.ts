/**
 * Jednokratno čišćenje WP uvoz artefakata („n“, „nnn“) u bazi.
 * Pokretanje: node --env-file=.env scripts/clean-wp-n-noise.ts
 */
import mysql from "mysql2/promise";

import {
  preparePublicPlainText,
  stripNPlaceholderBlocks,
} from "../lib/public-cms-html.ts";
import { sanitizeWordPressContent } from "../scripts/lib/sanitize-wordpress-content.ts";

function cleanBody(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return raw;
  const cleaned = stripNPlaceholderBlocks(
    sanitizeWordPressContent(raw, { contentKind: "html" }),
  );
  return cleaned.trim() === "" ? null : cleaned;
}

function cleanPlain(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return raw;
  const cleaned = preparePublicPlainText(raw);
  return cleaned.trim() === "" ? null : cleaned;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL nije postavljen.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  let updated = 0;

  const [posts] = await conn.execute(
    `SELECT id, excerpt, body FROM post_translations`,
  );
  for (const row of posts as { id: string; excerpt: string | null; body: string | null }[]) {
    const nextExcerpt = cleanPlain(row.excerpt);
    const nextBody = cleanBody(row.body);
    if (nextExcerpt !== row.excerpt || nextBody !== row.body) {
      await conn.execute(
        `UPDATE post_translations SET excerpt = ?, body = ? WHERE id = ?`,
        [nextExcerpt, nextBody, row.id],
      );
      updated += 1;
    }
  }

  const [pages] = await conn.execute(
    `SELECT id, body FROM site_page_translations`,
  );
  for (const row of pages as { id: string; body: string | null }[]) {
    const nextBody = cleanBody(row.body);
    if (nextBody !== row.body) {
      await conn.execute(`UPDATE site_page_translations SET body = ? WHERE id = ?`, [
        nextBody,
        row.id,
      ]);
      updated += 1;
    }
  }

  const [strings] = await conn.execute(
    `SELECT id, value FROM site_locale_strings`,
  );
  for (const row of strings as { id: string; value: string | null }[]) {
    const raw = row.value ?? "";
    const next =
      raw.includes("<") || raw.includes("&nbsp;")
        ? cleanPlain(raw) ?? cleanBody(raw)
        : cleanPlain(raw);
    if (next !== row.value) {
      await conn.execute(`UPDATE site_locale_strings SET value = ? WHERE id = ?`, [
        next,
        row.id,
      ]);
      updated += 1;
    }
  }

  await conn.end();
  console.log(`Gotovo. Ažurirano redova: ${updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
