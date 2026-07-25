/**
 * Šalje SAMO stranicu virtuelne ture + header link na produkciju.
 * Ne briše ostali sadržaj (za razliku od npm run deploy).
 *
 *   node --env-file=.env scripts/push-virtual-tour-to-prod.mjs
 *
 * Zahtijeva CONTENT_SYNC_SECRET koji se poklapa sa Hostinger env.
 */
import { createConnection } from "mysql2/promise";
import {
  escapeValue,
  parseDbFromEnv,
  prodConfig,
} from "./lib/content-sync.mjs";

const SLUG = "virtuelna-tura";
const HREF = `/s/${SLUG}`;

async function main() {
  const { url, secret } = prodConfig();
  if (!process.env.CONTENT_SYNC_SECRET?.trim()) {
    console.error(
      "Nedostaje CONTENT_SYNC_SECRET u lokalnom .env.\n" +
        "Kopiraj istu vrijednost kao na Hostingeru (Environment variables),\n" +
        "sačuvaj .env, pa ponovo pokreni ovu skriptu.",
    );
    process.exit(1);
  }

  const cfg = parseDbFromEnv();
  const conn = await createConnection(cfg);

  let pageRows;
  let pageTrans;
  let navRows;
  let navTrans;
  try {
    [pageRows] = await conn.query(
      "SELECT * FROM `site_pages` WHERE `slug` = ? LIMIT 1",
      [SLUG],
    );
    if (!pageRows.length) {
      throw new Error(`Lokalno nema stranice slug=${SLUG}. Pokreni npm run seed:virtual-tour.`);
    }
    const pageId = pageRows[0].id;
    [pageTrans] = await conn.query(
      "SELECT * FROM `site_page_translations` WHERE `page_id` = ?",
      [pageId],
    );
    [navRows] = await conn.query(
      "SELECT * FROM `nav_links` WHERE `href` = ? AND `placement` = 'header' LIMIT 1",
      [HREF],
    );
    if (!navRows.length) {
      throw new Error(`Lokalno nema nav linka ${HREF}. Pokreni npm run seed:virtual-tour.`);
    }
    const navId = navRows[0].id;
    [navTrans] = await conn.query(
      "SELECT * FROM `nav_link_translations` WHERE `nav_link_id` = ?",
      [navId],
    );
  } finally {
    await conn.end();
  }

  const pageId = pageRows[0].id;
  const navId = navRows[0].id;

  function insertSql(table, rows) {
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(", ");
    const values = rows
      .map((r) => `(${Object.values(r).map(escapeValue).join(", ")})`)
      .join(",\n  ");
    return `INSERT INTO \`${table}\` (${cols}) VALUES\n  ${values};\n`;
  }

  const sql = [
    "-- push virtual tour only",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;",
    `DELETE FROM \`site_page_translations\` WHERE \`page_id\` = ${escapeValue(pageId)};`,
    `DELETE FROM \`site_pages\` WHERE \`slug\` = ${escapeValue(SLUG)};`,
    insertSql("site_pages", pageRows),
    insertSql("site_page_translations", pageTrans),
    `DELETE FROM \`nav_link_translations\` WHERE \`nav_link_id\` = ${escapeValue(navId)};`,
    `DELETE FROM \`nav_links\` WHERE \`id\` = ${escapeValue(navId)};`,
    `DELETE FROM \`nav_links\` WHERE \`href\` = ${escapeValue(HREF)} AND \`placement\` = 'header';`,
    insertSql("nav_links", navRows),
    insertSql("nav_link_translations", navTrans),
    "SET FOREIGN_KEY_CHECKS=1;",
  ].join("\n");

  const endpoint = `${url}/api/sync/content?secret=${encodeURIComponent(secret)}`;
  console.log(`Push: šaljem virtuelnu turu na ${url} ...`);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/sql" },
    body: sql,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 400)}`);
  }
  console.log("Push: gotovo — /me/s/virtuelna-tura bi trebalo da radi.");
}

main().catch((e) => {
  console.error("Push greška:", e.message);
  process.exit(1);
});
