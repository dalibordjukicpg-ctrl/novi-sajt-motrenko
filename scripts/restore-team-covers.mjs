#!/usr/bin/env node
/**
 * Vrati team cover slike na wp-media / stare upload-e (prije crop/upload sesije).
 * node --env-file=.env scripts/restore-team-covers.mjs
 */
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  parseDbFromEnv,
  prodConfig,
  exportContentFromConnection,
} from "./lib/content-sync.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env"), override: true });

const RESTORE_COVERS = {
  "mr-sci-dr-tatjana-motrenko-simic": "wp-media/86ccc5d50cd4_DUS_6996c.jpg",
  "dr-ana-bogdanovic": "wp-media/86d037f87af1_DUS_4836c.jpg",
  "jelena-popovic-klinicki-embriolog": "wp-media/b8fefc7e16b9_DUS_6993c.jpg",
  "sasa-lozo": "wp-media/027e0c6e78ad_DUS_4844c.jpg",
  "milena-radulovic-visa-med-sestra-glavna-sestra": "wp-media/9ea4c1ae265a_DUS_4826c.jpg",
  "maja-scekic-visa-med-sestra-koordinator-za-ivf": "wp-media/96a56e0da25a_DUS_4861c.jpg",
  "aleksandra-obradovic-medicinska-sestra-tehnicar": "wp-media/baeaaf8c3bc5_DUS_4823c.jpg",
  "marina-colic-medicinski-tehnicar-sestra": "wp-media/1d251b34bbe4_DUS_4919c.jpg",
  "boris-kojicic": "wp-media/d44a491fa40a_DUS_4907c.jpg",
  "dr-marija-petricevic": "uploads/905ae7df-cfa6-4b14-9603-d458ebb8fd49.png",
  "dr-milenko-tadic": "uploads/09fbf18f-30b7-446c-8e57-a9f104b4a7b1.png",
  "jasna-mijanovic-embriolog": "uploads/3f5f802a-a0a0-4f04-9804-ae28af786ca3.png",
  "dr-ivan": "uploads/db02ddab-fff3-410a-bacc-ce64c8ae652a.jpg",
  "biografija-zeljko-lazovic": "uploads/6bc7354f-9c7a-41a6-b10a-f4a22fb8aeac.png",
};

const conn = await createConnection(parseDbFromEnv());

for (const [slug, storageKey] of Object.entries(RESTORE_COVERS)) {
  const [[m]] = await conn.query("SELECT id FROM media WHERE storage_key = ? LIMIT 1", [
    storageKey,
  ]);
  const [[p]] = await conn.query(
    `SELECT p.id, pt.title FROM posts p
     JOIN post_translations pt ON pt.post_id = p.id AND pt.locale = 'me'
     WHERE pt.slug = ?`,
    [slug],
  );
  if (!m || !p) {
    console.warn("SKIP", slug);
    continue;
  }
  await conn.query("UPDATE posts SET cover_media_id = ?, updated_at = NOW(3) WHERE id = ?", [
    m.id,
    p.id,
  ]);
  console.log("OK", p.title, "->", storageKey);
}

await conn.end();

const { url, secret } = prodConfig();
const c2 = await createConnection(parseDbFromEnv());
let sql;
try {
  sql = await exportContentFromConnection(c2);
} finally {
  await c2.end();
}

const res = await fetch(`${url}/api/sync/content?secret=${encodeURIComponent(secret)}`, {
  method: "POST",
  headers: { "Content-Type": "application/sql" },
  body: sql,
});
if (!res.ok) throw new Error(await res.text());
console.log("Produkcija ažurirana.");
