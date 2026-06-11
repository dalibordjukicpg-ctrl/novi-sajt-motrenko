#!/usr/bin/env node
/** npm run deploy — lokal → produkcija (sadržaj + git push) */
import { createConnection } from "mysql2/promise";
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  exportContentFromConnection,
  parseDbFromEnv,
  prodConfig,
} from "./lib/content-sync.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function pushContentToProd() {
  const { url, secret } = prodConfig();
  const cfg = parseDbFromEnv();
  const conn = await createConnection(cfg);
  let sql;
  try {
    sql = await exportContentFromConnection(conn);
  } finally {
    await conn.end();
  }

  console.log(`Deploy: šaljem sadržaj na ${url} ...`);
  const endpoint = `${url}/api/admin/db-push?secret=${encodeURIComponent(secret)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/sql" },
    body: sql,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 300)}`);
  }
  console.log("Deploy: sadržaj na produkciji ažuriran.");
}

function gitPush() {
  console.log("Deploy: git push ...");
  const r = spawnSync("git", ["push"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function main() {
  await pushContentToProd();
  gitPush();
  console.log("Deploy: gotovo — kod i sadržaj su na produkciji.");
}

main().catch((e) => {
  console.error("Deploy greška:", e.message);
  process.exit(1);
});
