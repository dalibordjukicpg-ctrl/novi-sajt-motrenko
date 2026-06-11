#!/usr/bin/env node
/**
 * npm run db:pull
 *
 * 1. Poveže se na produkciju (PROD_SITE_URL + DB_PULL_SECRET)
 * 2. Preuzme SQL export sadržajnih tabela
 * 3. Importuje u lokalnu bazu (DATABASE_URL ili MYSQL_* vars)
 *
 * Ne dotiče: users, auth_sessions, admin lozinke.
 */

import { createConnection } from "mysql2/promise";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── učitaj .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ── provjeri konfiguraciju ───────────────────────────────────────────────────
const PROD_URL  = (process.env.PROD_SITE_URL  || "").replace(/\/$/, "");
const SECRET    =  process.env.DB_PULL_SECRET || "";

if (!PROD_URL) {
  console.error("❌  PROD_SITE_URL nije podešen u .env (npr. https://mojsajt.com)");
  process.exit(1);
}
if (!SECRET || SECRET.length < 16) {
  console.error("❌  DB_PULL_SECRET nije podešen u .env (min 16 znakova)");
  process.exit(1);
}

// ── parsiranje lokalne DB veze ───────────────────────────────────────────────
function parseLocalDb() {
  const url = process.env.DATABASE_URL || "";
  if (url) {
    const u = new URL(url);
    return {
      host:     u.hostname || "127.0.0.1",
      port:     parseInt(u.port || "3306", 10),
      user:     decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  return {
    host:     process.env.MYSQL_HOST     || "127.0.0.1",
    port:     parseInt(process.env.MYSQL_PORT || "3306", 10),
    user:     process.env.MYSQL_USER     || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "",
  };
}

// ── dohvati SQL sa produkcije ────────────────────────────────────────────────
async function fetchSql() {
  const endpoint = `${PROD_URL}/api/admin/db-pull?secret=${encodeURIComponent(SECRET)}`;
  console.log(`📡  Preuzimam sa: ${PROD_URL}/api/admin/db-pull ...`);
  const res = await fetch(endpoint);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
  }
  return res.text();
}

// ── izvrši SQL lokalno ───────────────────────────────────────────────────────
async function importSql(sql) {
  const cfg = parseLocalDb();
  console.log(`🗄️   Importujem u lokalnu bazu: ${cfg.database}@${cfg.host}:${cfg.port}`);
  const conn = await createConnection({ ...cfg, multipleStatements: true });
  try {
    await conn.query(sql);
    console.log("✅  Import završen.\n");
  } finally {
    await conn.end();
  }
}

// ── opcioni: sync media fajlova ──────────────────────────────────────────────
async function syncMedia(sql) {
  // izvuci sve storage_key vrijednosti
  const matches = [...sql.matchAll(/,\s*'([^']+\.[a-z0-9]{2,6})'/gi)];
  const UPLOADS = join(ROOT, "public", "uploads");

  const keys = [];
  for (const m of matches) {
    const k = m[1];
    if (k.includes("/") || k.length < 5) continue;
    if (existsSync(join(UPLOADS, k))) continue;
    keys.push(k);
  }

  if (keys.length === 0) {
    console.log("🖼️   Svi media fajlovi su već lokalno prisutni.");
    return;
  }

  console.log(`🖼️   Preuzimam ${keys.length} nedostajućih fajlova...`);
  const { mkdirSync, createWriteStream } = await import("fs");
  mkdirSync(UPLOADS, { recursive: true });

  let ok = 0, fail = 0;
  for (const key of keys) {
    const url = `${PROD_URL}/uploads/${key}`;
    try {
      const r = await fetch(url);
      if (!r.ok) { fail++; continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      const { writeFileSync } = await import("fs");
      writeFileSync(join(UPLOADS, key), buf);
      ok++;
    } catch {
      fail++;
    }
  }
  console.log(`   ✅ ${ok} preuzeto  ⚠️ ${fail} nije dostupno`);
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const sql = await fetchSql();
    const lines = sql.split("\n").length;
    console.log(`   Primljeno ${lines} linija SQL-a.`);
    await importSql(sql);
    await syncMedia(sql);
    console.log("🎉  Lokalna baza i media su sinkronizovani sa produkcijom!");
  } catch (e) {
    console.error("\n❌  Greška:", e.message);
    process.exit(1);
  }
})();
