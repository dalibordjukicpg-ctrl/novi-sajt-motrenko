#!/usr/bin/env node
/** npm run sync — produkcija → lokal (baza + slike) */
import { createConnection } from "mysql2/promise";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  exportContentFromConnection,
  parseDbFromEnv,
  prodConfig,
} from "./lib/content-sync.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPLOADS = join(ROOT, "public", "uploads");

async function fetchProdSql() {
  const { url, secret } = prodConfig();
  const endpoint = `${url}/api/sync/content?secret=${encodeURIComponent(secret)}`;
  console.log(`Sync: preuzimam sadržaj sa ${url} ...`);
  const res = await fetch(endpoint);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 300)}`);
  }
  return res.text();
}

async function importSql(sql) {
  const cfg = parseDbFromEnv();
  const conn = await createConnection({ ...cfg, multipleStatements: true });
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

async function syncMediaFromDb() {
  const { url } = prodConfig();
  const cfg = parseDbFromEnv();
  const conn = await createConnection(cfg);
  let keys = [];
  try {
    const [rows] = await conn.query(
      "SELECT storage_key FROM media WHERE storage_key IS NOT NULL",
    );
    keys = rows.map((r) => r.storage_key).filter(Boolean);
  } finally {
    await conn.end();
  }

  mkdirSync(UPLOADS, { recursive: true });
  const missing = keys.filter((k) => !existsSync(join(UPLOADS, k)));
  if (missing.length === 0) {
    console.log("Sync: slike su već lokalno.");
    return;
  }

  console.log(`Sync: preuzimam ${missing.length} slika...`);
  let ok = 0;
  for (const key of missing) {
    try {
      const r = await fetch(`${url}/uploads/${key}`);
      if (!r.ok) continue;
      writeFileSync(join(UPLOADS, key), Buffer.from(await r.arrayBuffer()));
      ok++;
    } catch {
      /* preskoči */
    }
  }
  console.log(`Sync: ${ok}/${missing.length} slika preuzeto.`);
}

export async function syncFromProd() {
  const sql = await fetchProdSql();
  await importSql(sql);
  await syncMediaFromDb();
  console.log("Sync: lokal = produkcija.");
}

if (process.argv[1]?.endsWith("sync-from-prod.mjs")) {
  syncFromProd().catch((e) => {
    console.error("Sync greška:", e.message);
    process.exit(1);
  });
}
