#!/usr/bin/env node
/**
 * Pravi portret covere iz wp-media panorama (4:5) za članove tima.
 * node --env-file=.env scripts/crop-team-portraits.mjs
 * node --env-file=.env scripts/crop-team-portraits.mjs --dry-run
 */
import { createConnection } from "mysql2/promise";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import sharp from "sharp";

import { parseDbFromEnv, prodConfig } from "./lib/content-sync.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPLOADS = join(ROOT, "public", "uploads");
config({ path: join(ROOT, ".env"), override: true });

/** Lijevi offset u px za portret crop iz panorama (0 = lijevo). */
const CROP_LEFT = {
  "mr-sci-dr-tatjana-motrenko-simic": 0,
  "dr-ana-bogdanovic": 0,
  "jelena-popovic-klinicki-embriolog": 0,
  "sasa-lozo": 0,
  "milena-radulovic-visa-med-sestra-glavna-sestra": 0,
  "maja-scekic-visa-med-sestra-koordinator-za-ivf": 0,
  "aleksandra-obradovic-medicinska-sestra-tehnicar": 0,
  "marina-colic-medicinski-tehnicar-sestra": 0,
  "boris-kojicic": 0,
};

/** wp-media izvor po slug-u — uvijek se re-cropuje (bez upscalinga). */
const TEAM_WP_SOURCES = {
  "mr-sci-dr-tatjana-motrenko-simic": "wp-media/86ccc5d50cd4_DUS_6996c.jpg",
  "dr-ana-bogdanovic": "wp-media/86d037f87af1_DUS_4836c.jpg",
  "jelena-popovic-klinicki-embriolog": "wp-media/b8fefc7e16b9_DUS_6993c.jpg",
  "sasa-lozo": "wp-media/027e0c6e78ad_DUS_4844c.jpg",
  "milena-radulovic-visa-med-sestra-glavna-sestra": "wp-media/9ea4c1ae265a_DUS_4826c.jpg",
  "maja-scekic-visa-med-sestra-koordinator-za-ivf": "wp-media/96a56e0da25a_DUS_4861c.jpg",
  "aleksandra-obradovic-medicinska-sestra-tehnicar":
    "wp-media/baeaaf8c3bc5_DUS_4823c.jpg",
  "marina-colic-medicinski-tehnicar-sestra": "wp-media/1d251b34bbe4_DUS_4919c.jpg",
  "boris-kojicic": "wp-media/d44a491fa40a_DUS_4907c.jpg",
};

async function cropPortrait(absPath, leftPx) {
  const meta = await sharp(absPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("no dimensions");

  const cropH = h;
  const cropW = Math.min(Math.round((cropH * 4) / 5), w);
  const left = Math.min(Math.max(0, leftPx), Math.max(0, w - cropW));

  // Downscale sa sharp (lanczos) — browser loše smanjuje 2500px+ na 130px thumbnail.
  return sharp(absPath)
    .extract({ left, top: 0, width: cropW, height: cropH })
    .resize(800, 1000, {
      fit: "cover",
      position: "top",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

async function pushFilesToProd(storageKeys) {
  const { url, secret } = prodConfig();
  const files = storageKeys.map((storageKey) => {
    const abs = join(ROOT, "public", storageKey);
    const buf = readFileSync(abs);
    return { storageKey, dataBase64: buf.toString("base64") };
  });
  for (let i = 0; i < files.length; i += 5) {
    const batch = files.slice(i, i + 5);
    const res = await fetch(`${url}/api/sync/uploads?secret=${encodeURIComponent(secret)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: batch }),
    });
    if (!res.ok) throw new Error(await res.text());
  }
}

async function pushContentToProd() {
  const { exportContentFromConnection } = await import("./lib/content-sync.mjs");
  const { url, secret } = prodConfig();
  const conn = await createConnection(parseDbFromEnv());
  let sql;
  try {
    sql = await exportContentFromConnection(conn);
  } finally {
    await conn.end();
  }
  const res = await fetch(`${url}/api/sync/content?secret=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: { "Content-Type": "application/sql" },
    body: sql,
  });
  if (!res.ok) throw new Error(await res.text());
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const conn = await createConnection(parseDbFromEnv());
  const [rows] = await conn.query(
    `SELECT p.id, pt.slug, pt.title, m.storage_key, m.id AS media_id
     FROM posts p
     JOIN post_translations pt ON pt.post_id = p.id AND pt.locale = 'me'
     LEFT JOIN media m ON m.id = p.cover_media_id
     WHERE p.content_role = 'team' AND p.published = 1`,
  );

  mkdirSync(UPLOADS, { recursive: true });
  const toProd = [];

  for (const row of rows) {
    const sourceKey = TEAM_WP_SOURCES[row.slug];
    if (!sourceKey) {
      console.log(`skip: ${row.title}`);
      continue;
    }

    const abs = join(ROOT, "public", sourceKey);
    if (!existsSync(abs)) {
      console.warn(`missing file: ${sourceKey}`);
      continue;
    }

    const left = CROP_LEFT[row.slug] ?? 0;
    console.log(`crop: ${row.title} (${sourceKey}, left=${left})`);

    if (dryRun) continue;

    const buf = await cropPortrait(abs, left);
    const id = randomUUID();
    const storageKey = `uploads/${id}.jpg`;
    const dest = join(UPLOADS, `${id}.jpg`);
    await sharp(buf).toFile(dest);

    await conn.query(
      `INSERT INTO media (id, filename, storage_key, mime_type, size_bytes, created_at)
       VALUES (?, ?, ?, 'image/jpeg', ?, NOW(3))`,
      [id, `${row.slug}-portrait.jpg`, storageKey, buf.length],
    );
    await conn.query(`UPDATE posts SET cover_media_id = ?, updated_at = NOW(3) WHERE id = ?`, [
      id,
      row.id,
    ]);

    const meta = await sharp(buf).metadata();
    console.log(`  -> /${storageKey} (${meta.width}x${meta.height}, ${Math.round(buf.length / 1024)} KB)`);
    toProd.push(storageKey);
  }

  await conn.end();

  if (dryRun) {
    console.log("\nDry-run gotov.");
    return;
  }

  if (toProd.length === 0) {
    console.log("Nema wp-media covera za crop.");
    return;
  }

  await pushFilesToProd(toProd);
  await pushContentToProd();
  console.log(`\nGotovo — ${toProd.length} portreta na produkciji.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
