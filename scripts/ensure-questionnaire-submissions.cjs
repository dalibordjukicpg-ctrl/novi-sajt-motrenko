/**
 * Idempotentna tabela za poslane upitnike (migracija 0024).
 * Pokreće se pri build/start kad je DATABASE_URL dostupan.
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

async function tableExists(conn, name) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

async function runIgnoreDup(conn, sql) {
  try {
    await conn.query(sql);
  } catch (e) {
    const code = e && e.code;
    if (code === "ER_DUP_KEYNAME" || code === "ER_DUP_FIELDNAME" || code === "ER_FK_DUP_NAME") {
      return;
    }
    if (code === "ER_TABLE_EXISTS_ERROR") return;
    throw e;
  }
}

async function ensureSchema(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS questionnaire_submissions (
      id varchar(36) NOT NULL,
      locale enum('me','en','ru') NOT NULL,
      female_name varchar(200) NOT NULL,
      female_email varchar(255) NOT NULL,
      male_name varchar(200) NULL,
      male_email varchar(255) NULL,
      phone varchar(64) NULL,
      form_data_json longtext NOT NULL,
      pdf_storage_key varchar(512) NOT NULL,
      pdf_filename varchar(255) NOT NULL,
      pdf_size_bytes int NOT NULL,
      staff_email_sent boolean NOT NULL DEFAULT false,
      staff_pdf_email_sent boolean NOT NULL DEFAULT false,
      patient_email_sent boolean NOT NULL DEFAULT false,
      created_at datetime(3) NOT NULL,
      ip_address varchar(45) NULL,
      user_agent varchar(512) NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await runIgnoreDup(
    conn,
    "CREATE INDEX questionnaire_submissions_created_at_idx ON questionnaire_submissions (created_at)",
  );
  await runIgnoreDup(
    conn,
    "CREATE INDEX questionnaire_submissions_female_email_idx ON questionnaire_submissions (female_email)",
  );
}

async function main() {
  let url;
  try {
    url = getDatabaseUrl();
  } catch (e) {
    console.warn("[ensure-questionnaire-submissions] preskačem — nema DATABASE_URL:", e.message);
    process.exit(0);
  }

  const conn = await mysql.createConnection(url);
  try {
    if (await tableExists(conn, "questionnaire_submissions")) {
      console.log("[ensure-questionnaire-submissions] OK — tabela postoji");
      return;
    }

    await ensureSchema(conn);
    console.log("[ensure-questionnaire-submissions] tabela kreirana");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[ensure-questionnaire-submissions] FATAL:", e.message || e);
  process.exit(1);
});
