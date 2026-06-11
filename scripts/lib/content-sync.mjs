/** Mora biti isto kao lib/content-sync-secret.ts */
export const CONTENT_SYNC_SECRET = "hrc-motrenko-content-sync-2026";

/** Produkcijski URL — isto kao lib/site-url.ts */
export const PRODUCTION_SITE_URL = "https://humanreproduction.com";

/** Imena sadržajnih tabela — isti redoslijed kao lib/content-db-sync.ts */
export const CONTENT_TABLES = [
  "site_globals",
  "site_locale_strings",
  "nav_links",
  "nav_link_translations",
  "site_pages",
  "site_page_translations",
  "media",
  "media_alt_translations",
  "posts",
  "post_translations",
  "home_service_cards",
  "home_service_card_translations",
  "home_team_highlights",
  "home_team_highlight_translations",
];

export function escapeValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) {
    return `'${v.toISOString().slice(0, 23).replace("T", " ")}'`;
  }
  const s = String(v);
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
}

export function rowsToSql(tableName, rows) {
  if (rows.length === 0) return `-- ${tableName}: prazno\n`;
  const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(", ");
  const values = rows
    .map((r) => `(${Object.values(r).map(escapeValue).join(", ")})`)
    .join(",\n  ");
  return `INSERT INTO \`${tableName}\` (${cols}) VALUES\n  ${values};\n`;
}

export async function exportContentFromConnection(conn) {
  const lines = [
    "-- HRC — sadržajne tabele",
    `-- ${new Date().toISOString()}`,
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;\n",
  ];

  for (const name of CONTENT_TABLES) {
    const [rows] = await conn.query(`SELECT * FROM \`${name}\``);
    lines.push(`-- ${name} (${rows.length})`);
    lines.push(`DELETE FROM \`${name}\`;`);
    lines.push(rowsToSql(name, rows));
  }

  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  return lines.join("\n");
}

export function parseDbFromEnv() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname || "127.0.0.1",
      port: parseInt(u.port || "3306", 10),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "",
  };
}

export function prodConfig() {
  const url = (process.env.PROD_SITE_URL || PRODUCTION_SITE_URL).replace(/\/$/, "");
  return { url, secret: CONTENT_SYNC_SECRET };
}
