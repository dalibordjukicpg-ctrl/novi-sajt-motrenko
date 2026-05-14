/**
 * Mora biti prvi import u CLI skriptama koje učitavaju `lib/db` — inače ESM
 * izvrši `import "../lib/db"` prije `loadEnv()` u tijelu fajla.
 */
import path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env"), override: true });
