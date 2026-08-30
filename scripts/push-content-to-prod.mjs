#!/usr/bin/env node
/** Šalje samo CMS sadržaj lokal → produkcija (bez git push). */
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  exportContentFromConnection,
  parseDbFromEnv,
  prodConfig,
} from "./lib/content-sync.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env"), override: true });

async function main() {
  const { url, secret } = prodConfig();
  const cfg = parseDbFromEnv();
  const conn = await createConnection(cfg);
  let sql;
  try {
    sql = await exportContentFromConnection(conn);
  } finally {
    await conn.end();
  }

  console.log(`Šaljem sadržaj na ${url} ...`);
  const endpoint = `${url}/api/sync/content?secret=${encodeURIComponent(secret)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/sql" },
    body: sql,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 400)}`);
  }
  console.log("OK:", text.slice(0, 200));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
