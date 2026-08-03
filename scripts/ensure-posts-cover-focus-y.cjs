/**
 * Idempotentna kolona posts.cover_focus_y (migracija 0027).
 * Pokreće se pri startu na Hostingeru kad je DATABASE_URL dostupan.
 */
const mysql = require("mysql2/promise");
const path = require("path");

try {
  require("dotenv").config({
    path: path.join(process.cwd(), ".env"),
    override: true,
  });
} catch {
  /* dotenv opcionalan */
}

function cleanEnv(value) {
  if (value === undefined || value === null) return undefined;
  let s = String(value).trim().replace(/^\uFEFF/, "");
  if (!s) return undefined;
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

function getDatabaseUrl() {
  const raw = cleanEnv(process.env.DATABASE_URL);
  if (raw) {
    return raw.replace(/^mysql2:/i, "mysql:");
  }
  const user = cleanEnv(process.env.MYSQL_USER);
  const password = cleanEnv(process.env.MYSQL_PASSWORD) ?? "";
  const host = cleanEnv(process.env.MYSQL_HOST) || "127.0.0.1";
  const port = cleanEnv(process.env.MYSQL_PORT) || "3306";
  const database = cleanEnv(process.env.MYSQL_DATABASE);
  if (user && database) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }
  throw new Error("DATABASE_URL ili MYSQL_* nije postavljen");
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function main() {
  let url;
  try {
    url = getDatabaseUrl();
  } catch (e) {
    console.warn(
      "[ensure-posts-cover-focus-y] preskačem — nema DATABASE_URL:",
      e.message,
    );
    process.exit(0);
  }

  const conn = await mysql.createConnection(url);
  try {
    if (await columnExists(conn, "posts", "cover_focus_y")) {
      console.log("[ensure-posts-cover-focus-y] OK — posts.cover_focus_y postoji");
      return;
    }

    console.log("[ensure-posts-cover-focus-y] dodajem posts.cover_focus_y…");
    await conn.query(
      "ALTER TABLE `posts` ADD `cover_focus_y` int NOT NULL DEFAULT 50",
    );
    console.log("[ensure-posts-cover-focus-y] kolona dodata");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[ensure-posts-cover-focus-y] FATAL:", e.message || e);
  process.exit(1);
});
