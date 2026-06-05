/**
 * Jednokratno čišćenje WP uvoz artefakata („n“, „nnn“) u bazi.
 * Pokretanje: node --env-file=.env scripts/clean-wp-n-noise.ts
 */
import { cleanWpNNoiseInDatabase } from "../lib/cms/clean-wp-n-noise-db.ts";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL nije postavljen.");
    process.exit(1);
  }

  const { updated, byTable, errors } = await cleanWpNNoiseInDatabase();
  console.log(`Gotovo. Ažurirano redova: ${updated}`);
  for (const [table, count] of Object.entries(byTable)) {
    console.log(`  ${table}: ${count}`);
  }
  if (errors.length > 0) {
    console.warn(`Upozorenja (${errors.length}):`);
    for (const err of errors.slice(0, 10)) {
      console.warn(`  - ${err}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
