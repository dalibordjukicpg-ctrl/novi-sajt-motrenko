/**
 * Idempotent OTP tabele za admin login (migracija 0021).
 * Pokreće se pri build/start na Hostingeru kad je DATABASE_URL dostupan.
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
    CREATE TABLE IF NOT EXISTS admin_login_otp_challenges (
      id varchar(36) NOT NULL,
      user_id varchar(36) NOT NULL,
      secret_hash varchar(64) NOT NULL,
      otp_hash varchar(64) NOT NULL,
      otp_expires_at datetime(3) NOT NULL,
      wrong_attempts int NOT NULL DEFAULT 0,
      locked_until datetime(3) NULL,
      redirect_to varchar(512) NOT NULL,
      consumed_at datetime(3) NULL,
      ip_address varchar(45) NULL,
      user_agent varchar(512) NULL,
      created_at datetime(3) NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_login_otp_sends (
      id varchar(36) NOT NULL,
      user_id varchar(36) NOT NULL,
      created_at datetime(3) NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_trusted_devices (
      id varchar(36) NOT NULL,
      user_id varchar(36) NOT NULL,
      token_hash varchar(64) NOT NULL,
      expires_at datetime(3) NOT NULL,
      revoked_at datetime(3) NULL,
      ip_address varchar(45) NULL,
      user_agent varchar(512) NULL,
      created_at datetime(3) NOT NULL,
      last_used_at datetime(3) NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await runIgnoreDup(
    conn,
    `ALTER TABLE admin_login_otp_challenges
     ADD CONSTRAINT admin_login_otp_challenges_user_id_users_id_fk
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
  );
  await runIgnoreDup(
    conn,
    `ALTER TABLE admin_login_otp_sends
     ADD CONSTRAINT admin_login_otp_sends_user_id_users_id_fk
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
  );
  await runIgnoreDup(
    conn,
    `ALTER TABLE admin_trusted_devices
     ADD CONSTRAINT admin_trusted_devices_user_id_users_id_fk
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
  );

  await runIgnoreDup(
    conn,
    `CREATE INDEX admin_login_otp_challenges_user_id_idx ON admin_login_otp_challenges (user_id)`,
  );
  await runIgnoreDup(
    conn,
    `CREATE INDEX admin_login_otp_challenges_otp_expires_at_idx ON admin_login_otp_challenges (otp_expires_at)`,
  );
  await runIgnoreDup(
    conn,
    `CREATE INDEX admin_login_otp_sends_user_id_created_at_idx ON admin_login_otp_sends (user_id, created_at)`,
  );
  await runIgnoreDup(
    conn,
    `CREATE INDEX admin_trusted_devices_user_id_idx ON admin_trusted_devices (user_id)`,
  );
  await runIgnoreDup(
    conn,
    `CREATE INDEX admin_trusted_devices_expires_at_idx ON admin_trusted_devices (expires_at)`,
  );
}

async function main() {
  let url;
  try {
    url = getDatabaseUrl();
  } catch (e) {
    console.warn("[ensure-admin-login-otp] preskačem — nema DATABASE_URL:", e.message);
    process.exit(0);
  }

  const conn = await mysql.createConnection(url);
  try {
    const before = await Promise.all([
      tableExists(conn, "admin_login_otp_challenges"),
      tableExists(conn, "admin_login_otp_sends"),
      tableExists(conn, "admin_trusted_devices"),
    ]);
    if (before.every(Boolean)) {
      console.log("[ensure-admin-login-otp] OK — OTP tabele postoje");
      return;
    }
    await ensureSchema(conn);
    console.log("[ensure-admin-login-otp] OTP tabele kreirane/ažurirane");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[ensure-admin-login-otp] FATAL:", e.message || e);
  process.exit(1);
});
