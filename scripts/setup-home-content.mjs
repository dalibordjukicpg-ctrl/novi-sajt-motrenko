/**
 * Idempotentna migracija + seed za početnu stranicu (kartice usluga, tim highlight).
 * Pokreće se pri Hostinger build-u ako je DATABASE_URL postavljen.
 *
 * npm run db:setup-home
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config as loadEnv } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(root, ".env"), override: false });

const HOME_SERVICE_CARD_SEED_IDS = [
  "b2000001-0001-4001-8001-000000000001",
  "b2000001-0001-4001-8001-000000000002",
  "b2000001-0001-4001-8001-000000000003",
  "b2000001-0001-4001-8001-000000000004",
  "b2000001-0001-4001-8001-000000000005",
  "b2000001-0001-4001-8001-000000000006",
];

const DDL = [
  `CREATE TABLE IF NOT EXISTS \`home_service_cards\` (
    \`id\` varchar(36) NOT NULL,
    \`sort_order\` int NOT NULL DEFAULT 0,
    \`icon_name\` varchar(64) NOT NULL DEFAULT 'heart',
    \`href\` varchar(512) NOT NULL DEFAULT '#',
    \`visible\` boolean NOT NULL DEFAULT true,
    \`updated_at\` datetime(3) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`home_service_card_translations\` (
    \`id\` varchar(36) NOT NULL,
    \`card_id\` varchar(36) NOT NULL,
    \`locale\` enum('me','en','ru') NOT NULL,
    \`title\` varchar(500) NOT NULL DEFAULT '',
    \`description\` text,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`home_card_trans_card_locale\` (\`card_id\`,\`locale\`),
    CONSTRAINT \`hsc_trans_card_fk\` FOREIGN KEY (\`card_id\`) REFERENCES \`home_service_cards\` (\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`home_team_highlights\` (
    \`id\` varchar(36) NOT NULL,
    \`sort_order\` int NOT NULL DEFAULT 0,
    \`href\` varchar(512) NOT NULL DEFAULT '#',
    \`visible\` boolean NOT NULL DEFAULT true,
    \`updated_at\` datetime(3) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`home_team_highlight_translations\` (
    \`id\` varchar(36) NOT NULL,
    \`highlight_id\` varchar(36) NOT NULL,
    \`locale\` enum('me','en','ru') NOT NULL,
    \`title\` varchar(500) NOT NULL DEFAULT '',
    \`teaser\` text,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`home_team_hl_trans_hl_locale\` (\`highlight_id\`,\`locale\`),
    CONSTRAINT \`hth_trans_hl_fk\` FOREIGN KEY (\`highlight_id\`) REFERENCES \`home_team_highlights\` (\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

function cleanEnvScalar(value) {
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
  const raw = cleanEnvScalar(process.env.DATABASE_URL);
  if (raw) {
    return raw.replace(/^mysql2:/i, "mysql:");
  }
  const user = cleanEnvScalar(process.env.MYSQL_USER);
  const password = cleanEnvScalar(process.env.MYSQL_PASSWORD) ?? "";
  const host = cleanEnvScalar(process.env.MYSQL_HOST) || "127.0.0.1";
  const port = cleanEnvScalar(process.env.MYSQL_PORT) || "3306";
  const database = cleanEnvScalar(process.env.MYSQL_DATABASE);
  if (user && database) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }
  return null;
}

function hasDbConfig() {
  return Boolean(getDatabaseUrl());
}

async function tableExists(conn, name) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

/** Ukloni loše importovane kartice (mojibake) ili stare redove bez naših seed ID-jeva. */
async function maybeResetHomeServiceCards(conn) {
  if (!(await tableExists(conn, "home_service_cards"))) return;

  const [rows] = await conn.query("SELECT id FROM home_service_cards");
  if (rows.length === 0) return;

  const ids = rows.map((r) => r.id);
  const hasAllSeed = HOME_SERVICE_CARD_SEED_IDS.every((id) => ids.includes(id));
  if (hasAllSeed) return;

  const [bad] = await conn.query(
    `SELECT COUNT(*) AS c FROM home_service_card_translations WHERE title LIKE '%Ü%' OR title LIKE '%Ã%'`,
  );
  const badCount = Number(bad[0]?.c ?? 0);
  if (badCount > 0 || !hasAllSeed) {
    console.log("[setup-home-content] Reset home_service_cards (stari ili pogrešan encoding).");
    await conn.query("DELETE FROM home_service_card_translations");
    await conn.query("DELETE FROM home_service_cards");
  }
}

async function applyMigrations(conn) {
  for (const sql of DDL) {
    await conn.query(sql);
  }
  console.log("[setup-home-content] Tabele home_service_cards / home_team_highlights — OK.");
}

function runTsxSeed(scriptName) {
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const scriptPath = path.join(root, "scripts", scriptName);
  if (!fs.existsSync(tsxCli) || !fs.existsSync(scriptPath)) {
    throw new Error(`Nedostaje ${scriptName} ili tsx — pokreni npm install.`);
  }
  const r = spawnSync(
    process.execPath,
    [tsxCli, scriptPath],
    { cwd: root, env: process.env, stdio: "inherit" },
  );
  if (r.status !== 0) {
    throw new Error(`Seed ${scriptName} nije uspio (exit ${r.status ?? "?"}).`);
  }
}

async function main() {
  if (!hasDbConfig()) {
    console.log("[setup-home-content] Nema DATABASE_URL — preskačem (OK za lokalni build bez baze).");
    return;
  }

  const url = getDatabaseUrl();
  const conn = await mysql.createConnection({
    uri: url,
    charset: "utf8mb4",
    multipleStatements: false,
  });

  try {
    await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await applyMigrations(conn);
    await maybeResetHomeServiceCards(conn);
  } finally {
    await conn.end();
  }

  runTsxSeed("seed-home-service-cards.ts");
  runTsxSeed("seed-team-highlights.ts");
  console.log("[setup-home-content] Završeno.");
}

main().catch((e) => {
  console.error("[setup-home-content]", e);
  process.exit(1);
});
