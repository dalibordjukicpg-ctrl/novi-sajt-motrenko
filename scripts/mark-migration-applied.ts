import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";

import { getDatabaseUrl } from "../lib/database-url";

loadEnv({ path: path.resolve(process.cwd(), ".env"), override: true });

const TAG = process.argv[2];
if (!TAG || !/^\d{4}_/.test(TAG)) {
  console.error("Usage: tsx scripts/mark-migration-applied.ts <journal_tag e.g. 0007_site_pages_header_nav_group>");
  process.exit(1);
}

async function main() {
  const sqlPath = path.join(process.cwd(), "drizzle", `${TAG}.sql`);
  const raw = fs.readFileSync(sqlPath, "utf8");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  const entry = journal.entries.find((e) => e.tag === TAG);
  if (!entry) {
    console.error("Tag not in _journal.json:", TAG);
    process.exit(1);
  }

  const conn = await mysql.createConnection(getDatabaseUrl());
  try {
    const [rows] = await conn.query(
      "SELECT id FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
      [hash],
    );
    const existing = rows as { id: number }[];
    if (existing.length > 0) {
      console.log("Već označeno:", TAG);
      return;
    }
    await conn.query(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      [hash, entry.when],
    );
    console.log("Označeno kao primijenjeno:", TAG, entry.when);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
