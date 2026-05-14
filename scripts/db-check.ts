/**
 * Provjera MySQL konekcije: npm run db:check
 * Koristi istu logiku kao aplikacija (DATABASE_URL ili MYSQL_*).
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { RowDataPacket } from "mysql2";
import mysql from "mysql2/promise";

// Prepisuje stare varijable iz shell-a (npr. ostatak DATABASE_URL od drizzle-kit).
loadEnv({ path: path.resolve(process.cwd(), ".env"), override: true });

import { getDatabaseUrl } from "../lib/database-url";

function quoteId(name: string): string {
  return "`" + name.replace(/`/g, "``") + "`";
}

async function main() {
  console.log("--- Provjera baze (novi sajt dalibor) ---\n");

  let url: string;
  try {
    url = getDatabaseUrl();
  } catch (e) {
    console.error("Konfiguracija:", (e as Error).message);
    process.exit(1);
    return;
  }

  const safe = url.replace(/:[^:@]+@/, ":****@");
  console.log("Konekcija (URL sakriva lozinku):", safe, "\n");

  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection(url);
  } catch (e) {
    const err = e as {
      code?: string;
      errno?: number;
      sqlMessage?: string;
      message?: string;
    };
    console.error("NE MOŽE DA SE POVEŽE:\n");
    console.error("  code:", err.code);
    console.error("  errno:", err.errno);
    console.error("  sqlMessage:", err.sqlMessage ?? err.message);

    if (err.code === "ER_BAD_DB_ERROR") {
      console.error(
        "\n→ Baza iz .env ne postoji. Kreiraj je u phpMyAdmin ili pokreni: npm run db:create",
      );
    } else {
      console.error("\nŠta provjeriti:");
      console.error("  • Da li MySQL radi (XAMPP / WAMP / servis)?");
      console.error("  • MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE u .env");
      console.error("  • Da li baza postoji (phpMyAdmin → Baze)");
    }
    process.exit(1);
    return;
  }

  console.log("OK — konekcija uspjela.\n");

  const [dbRow] = await conn.query<RowDataPacket[]>(
    "SELECT DATABASE() AS db",
  );
  const currentDb = dbRow[0]?.db as string | null | undefined;

  const [allDbs] = await conn.query<RowDataPacket[]>("SHOW DATABASES");
  console.log("Postojeće MySQL baze:");
  for (const row of allDbs) {
    const name = String(Object.values(row)[0]);
    console.log("  •", name);
  }

  const dbName =
    process.env.MYSQL_DATABASE?.trim() || currentDb || "";

  if (dbName) {
    const exists = allDbs.some(
      (r) => String(Object.values(r)[0]) === dbName,
    );
    if (!exists) {
      console.log(
        `\n⚠ Baza "${dbName}" iz MYSQL_DATABASE ne postoji u listi gore. Napravi je u phpMyAdmin ili promijeni ime.`,
      );
    } else {
      const [tables] = await conn.query<RowDataPacket[]>(
        `SHOW TABLES FROM ${quoteId(dbName)}`,
      );
      const col = tables[0]
        ? String(Object.keys(tables[0] as object)[0])
        : "Tables_in_" + dbName;
      console.log(`\nTabele u "${dbName}": (${tables.length})`);
      for (const row of tables.slice(0, 40)) {
        console.log("  •", (row as Record<string, string>)[col]);
      }
      if (tables.length > 40) console.log("  … i još", tables.length - 40);
    }
  }

  await conn.end();
  console.log("\n--- Gotovo ---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
