/**
 * Jedan od dva načina u .env:
 * 1) DATABASE_URL=mysql://user:pass@host:3306/db  (posebni znakovi u lozinci → encode u URL-u)
 * 2) MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE (+ opciono MYSQL_HOST, MYSQL_PORT)
 *
 * Za Unicode (utf8mb4) aplikacija koristi {@link createMysqlPoolUtf8mb4} pri `createPool`.
 */
export function getDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const user = process.env.MYSQL_USER?.trim();
  const password = process.env.MYSQL_PASSWORD ?? "";
  const host = process.env.MYSQL_HOST?.trim() || "127.0.0.1";
  const port = process.env.MYSQL_PORT?.trim() || "3306";
  const database = process.env.MYSQL_DATABASE?.trim();

  if (user && database) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }

  throw new Error(
    "Postavi DATABASE_URL ili kombinaciju MYSQL_USER, MYSQL_PASSWORD i MYSQL_DATABASE u .env",
  );
}

/**
 * Izvorna WordPress MySQL baza (ETL skripte). Ne mijenja glavni DATABASE_URL.
 * WP_DATABASE_URL ili WP_MYSQL_* varijable.
 */
export function getWpSourceDatabaseUrl(): string {
  const direct = process.env.WP_DATABASE_URL?.trim();
  if (direct) return direct;

  const user = process.env.WP_MYSQL_USER?.trim();
  const password = process.env.WP_MYSQL_PASSWORD ?? "";
  const host = process.env.WP_MYSQL_HOST?.trim() || "127.0.0.1";
  const port = process.env.WP_MYSQL_PORT?.trim() || "3306";
  const database = process.env.WP_MYSQL_DATABASE?.trim();

  if (user && database) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }

  throw new Error(
    "Za ETL postavi WP_DATABASE_URL ili WP_MYSQL_USER, WP_MYSQL_PASSWORD, WP_MYSQL_DATABASE (i opciono WP_MYSQL_HOST, WP_MYSQL_PORT).",
  );
}
