/**
 * Kreira bazu ako ne postoji (root mora imati pravo CREATE): npm run db:create
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";

loadEnv({ path: path.resolve(process.cwd(), ".env"), override: true });

function quoteId(name: string): string {
  return "`" + name.replace(/`/g, "``") + "`";
}

async function main() {
  const host = process.env.MYSQL_HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT?.trim() || "3306");
  const user = process.env.MYSQL_USER?.trim();
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = process.env.MYSQL_DATABASE?.trim();

  if (!user || !database) {
    console.error("U .env postavi MYSQL_USER i MYSQL_DATABASE.");
    process.exit(1);
    return;
  }

  const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/`;

  console.log("Povezujem se (bez izbora baze)…");
  const conn = await mysql.createConnection(url);
  const safe = `${user}@${host}:${port}`;
  console.log("OK kao", safe);

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS ${quoteId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log(`Baza "${database}" je kreirana ili već postoji.`);
  await conn.end();
  console.log("Sad pokreni: npm run db:migrate");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
