/**
 * Uvoz velikog .sql fajla na udaljeni MySQL (bilo koji cloud host — vidi npm run vercel:checklist).
 * XAMPP MariaDB klijent često ne podržava caching_sha2_password (MySQL 8).
 *
 * DATABASE_URL=mysql://user:pass@host:port/db node scripts/import-sql-via-mysql2.mjs [putanja/do/dump.sql]
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL (mysql://...)");
  process.exit(1);
}

const rel =
  process.argv[2]?.trim() || path.join("scripts", "db-export.sql");
const sqlPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);

if (!fs.existsSync(sqlPath)) {
  console.error("SQL file not found:", sqlPath);
  process.exit(1);
}

/** PowerShell `>` često snima UTF-16 LE; mysqldump --result-file = UTF-8. */
function readSqlFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const copy = Buffer.from(buf.subarray(2));
    copy.swap16();
    return copy.toString("utf16le");
  }
  return buf.toString("utf8");
}

const sql = readSqlFile(sqlPath);

const conn = await mysql.createConnection({
  uri: url,
  multipleStatements: true,
  connectTimeout: 60_000,
});

try {
  await conn.query(sql);
  console.log("Import completed:", sqlPath);
} finally {
  await conn.end();
}
