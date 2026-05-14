/**
 * Jedan od dva načina u .env:
 * 1) DATABASE_URL=mysql://user:pass@host:3306/db  (posebni znakovi u lozinci → encode u URL-u)
 * 2) MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE (+ opciono MYSQL_HOST, MYSQL_PORT)
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
