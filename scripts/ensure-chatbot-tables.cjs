/**
 * Idempotentne tabele za chat bota (migracija 0028): podešavanja, baza znanja,
 * poruke osoblju i dnevna statistika. Pokreće se pri buildu i startu na Hostingeru.
 */
const fs = require("fs");
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
  let s = String(value).trim().replace(/^﻿/, "");
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

async function main() {
  let url;
  try {
    url = getDatabaseUrl();
  } catch (e) {
    console.warn("[ensure-chatbot-tables] preskačem — nema DATABASE_URL:", e.message);
    process.exit(0);
  }

  const sql = fs.readFileSync(
    path.join(process.cwd(), "drizzle", "0028_chatbot.sql"),
    "utf8",
  );
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await mysql.createConnection(url);
  try {
    for (const statement of statements) {
      await conn.query(statement);
    }
    console.log("[ensure-chatbot-tables] OK — tabele chat bota postoje");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[ensure-chatbot-tables] FATAL:", e.message || e);
  process.exit(1);
});
