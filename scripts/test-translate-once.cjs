/**
 * Brzi test admin prevoda (OpenAI). npm run test:translate
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const { getTranslateProvider, machineTranslatePlain } = await import(
    "../lib/machine-translate.ts"
  );
  const provider = getTranslateProvider();
  console.log("Provajder:", provider);
  const out = await machineTranslatePlain(
    "Dobro došli u našu kliniku",
    "en",
  );
  console.log("ME → EN:", out);
  console.log("OK — prevod radi.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
