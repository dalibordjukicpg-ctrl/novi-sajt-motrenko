import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./lib/database-url";

/** drizzle-kit često ne primeni `import "dotenv/config"`; učitaj .env eksplicitno. */
function loadDotenv(): void {
  const root = process.cwd();
  const envFile = path.join(root, ".env");
  const localFile = path.join(root, ".env.local");
  if (fs.existsSync(envFile)) {
    loadEnv({ path: envFile, override: true });
  }
  if (fs.existsSync(localFile)) {
    loadEnv({ path: localFile, override: true });
  }
}

loadDotenv();

let databaseUrl: string;
try {
  databaseUrl = getDatabaseUrl();
} catch {
  throw new Error(
    "Baza: postavi DATABASE_URL ili MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE u .env " +
      `(fajl: ${path.join(process.cwd(), ".env")})`,
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl,
  },
});
