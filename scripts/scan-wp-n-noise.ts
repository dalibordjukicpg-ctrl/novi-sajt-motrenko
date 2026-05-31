/**
 * Pregled redova sa WP „n“ / „nnn“ artefaktima u bazi.
 * node --env-file=.env scripts/scan-wp-n-noise.ts
 */
import mysql from "mysql2/promise";

const TABLES: { table: string; cols: string[] }[] = [
  { table: "post_translations", cols: ["title", "excerpt", "body", "meta_title", "meta_description"] },
  { table: "site_page_translations", cols: ["title", "body"] },
  { table: "site_locale_strings", cols: ["value"] },
  { table: "home_service_card_translations", cols: ["title", "description"] },
  { table: "home_team_highlight_translations", cols: ["title", "teaser"] },
  { table: "nav_link_translations", cols: ["label"] },
  { table: "media_alt_translations", cols: ["alt_text"] },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL nije postavljen.");
    process.exit(1);
  }
  const conn = await mysql.createConnection(url);
  let total = 0;
  for (const { table, cols } of TABLES) {
    for (const col of cols) {
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT id, \`${col}\` AS val FROM \`${table}\`
         WHERE \`${col}\` LIKE '%nnn%'
            OR \`${col}\` LIKE '% n %'
            OR \`${col}\` LIKE '%>n<%'
            OR \`${col}\` LIKE '%>n %'
            OR \`${col}\` LIKE '% n<%'`,
      );
      if (rows.length) {
        console.log(`\n${table}.${col}: ${rows.length}`);
        for (const r of rows.slice(0, 5)) {
          const preview = String(r.val ?? "").replace(/\s+/g, " ").slice(0, 120);
          console.log(`  ${r.id}: ${preview}`);
        }
        total += rows.length;
      }
    }
  }
  await conn.end();
  console.log(`\nUkupno sumnjivih redova: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
