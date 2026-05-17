/**
 * Kad su migracije u __drizzle_migrations zabilježene, a tabele nisu ažurirane:
 * nav_links.placement, nav_links.footer_column (0006), site_pages.header_nav_group (0007).
 *
 * npm run db:fix-schema-drift
 */
import path from "node:path";
import { config } from "dotenv";
import mysql from "mysql2/promise";
import { getDatabaseUrl } from "../lib/database-url";

config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const c = await mysql.createConnection(getDatabaseUrl());
  try {
    await c.query(
      "ALTER TABLE `nav_links` ADD `placement` enum('header','footer') NOT NULL DEFAULT 'header'",
    );
    console.log("Dodata kolona placement.");
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("placement već postoji.");
    } else {
      throw e;
    }
  }
  try {
    await c.query(
      "ALTER TABLE `nav_links` ADD `footer_column` int NOT NULL DEFAULT 0",
    );
    console.log("Dodata kolona footer_column.");
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("footer_column već postoji.");
    } else {
      throw e;
    }
  }
  try {
    await c.query(
      "ALTER TABLE `site_pages` ADD `header_nav_group` varchar(64)",
    );
    console.log("Dodata kolona site_pages.header_nav_group.");
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("header_nav_group već postoji.");
    } else {
      throw e;
    }
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
