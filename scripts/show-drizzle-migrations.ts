/**
 * npm run (nije u package.json obavezno):  
 * node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/show-drizzle-migrations.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";

import { getDatabaseUrl } from "../lib/database-url";

loadEnv({ path: path.resolve(process.cwd(), ".env"), override: true });

async function main() {
  const url = getDatabaseUrl();
  const conn = await mysql.createConnection(url);
  try {
    const [rawRows] = await conn.query(
      "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id",
    );
    const rows = rawRows as { id: number; hash: string; created_at: number | bigint }[];
    console.log("__drizzle_migrations:", rows.length, "redova");
    for (const r of rows) {
      console.log(r.id, String(r.created_at), r.hash?.slice(0, 20) + "…");
    }
  } catch (e) {
    console.error(e);
  }
  await conn.end();
}

main();
