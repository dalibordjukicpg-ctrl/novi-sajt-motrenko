/**
 * Idempotentne kolone za site_pages (migracija 0023):
 *   - unlisted                  boolean NOT NULL DEFAULT false
 *   - questionnaire_embed_url   varchar(2048) NULL
 *
 * Pokrece se pri build/start na Hostingeru kad je DATABASE_URL dostupan.
 * Bez ovih kolona, public header/footer query-ji u lib/queries/site.ts pucaju
 * (eq(sitePages.unlisted, false)).
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

async function tableExists(conn, name) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

async function main() {
  let url;
  try {
    url = getDatabaseUrl();
  } catch (e) {
    console.warn("[ensure-site-pages-unlisted] preskacem — nema DATABASE_URL:", e.message);
    process.exit(0);
  }

  const conn = await mysql.createConnection(url);
  try {
    if (!(await tableExists(conn, "site_pages"))) {
      console.log("[ensure-site-pages-unlisted] preskacem — site_pages tabela jos ne postoji (drizzle migrate ce je kreirati)");
      return;
    }

    const hasUnlisted = await columnExists(conn, "site_pages", "unlisted");
    const hasEmbedUrl = await columnExists(conn, "site_pages", "questionnaire_embed_url");

    if (hasUnlisted && hasEmbedUrl) {
      console.log("[ensure-site-pages-unlisted] OK — obje kolone postoje");
      return;
    }

    if (!hasUnlisted) {
      console.log("[ensure-site-pages-unlisted] dodajem kolonu site_pages.unlisted...");
      await conn.query(`
        ALTER TABLE site_pages
        ADD COLUMN unlisted boolean NOT NULL DEFAULT false AFTER published
      `);
      // Eksplicitno postavi sve postojece redove na false (NOT NULL DEFAULT vec radi to,
      // ali nikad ne skodi za stare verzije MySQL-a).
      await conn.query(`UPDATE site_pages SET unlisted = 0 WHERE unlisted IS NULL`);
      console.log("[ensure-site-pages-unlisted] kolona unlisted dodata, sve postojece stranice = false");
    }

    if (!hasEmbedUrl) {
      console.log("[ensure-site-pages-unlisted] dodajem kolonu site_pages.questionnaire_embed_url...");
      const afterClause = hasUnlisted || (await columnExists(conn, "site_pages", "unlisted"))
        ? "AFTER unlisted"
        : "";
      await conn.query(`
        ALTER TABLE site_pages
        ADD COLUMN questionnaire_embed_url varchar(2048) NULL ${afterClause}
      `);
      console.log("[ensure-site-pages-unlisted] kolona questionnaire_embed_url dodata");
    }

    console.log("[ensure-site-pages-unlisted] gotovo");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[ensure-site-pages-unlisted] FATAL:", e.message || e);
  // Ne padaj build — bolje da se aplikacija pokrene (mozda admin moze rucno popraviti)
  process.exit(0);
});
