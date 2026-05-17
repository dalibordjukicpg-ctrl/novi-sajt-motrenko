/**
 * Javni HTTPS link preko Cloudflare TryCloudflare (često pouzdanije od localtunnel).
 *
 * Potreban je binary `cloudflared` u PATH:
 *   winget install Cloudflare.cloudflared
 * Ili: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
 *
 * 1) npm run dev
 * 2) npm run share:dev:cf
 *
 * Štampa *.trycloudflare.com — dodaj u .env NEXT_PUBLIC_SITE_URL taj URL (bez /), restart dev.
 */
const { spawn, execSync } = require("child_process");
const path = require("path");

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  override: true,
});

const port = process.env.DEV_PORT?.trim() || "7392";

function cloudflaredOnPath() {
  try {
    execSync("cloudflared --version", { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

if (!cloudflaredOnPath()) {
  console.error(
    "\nNije pronađen `cloudflared` u PATH.\n" +
      "Instalacija (Windows): winget install Cloudflare.cloudflared\n" +
      "Zatim zatvori/otvori terminal i ponovo: npm run share:dev:cf\n\n" +
      "Alternativa: npm run share:dev (localtunnel)\n",
  );
  process.exit(1);
}

console.log(
  "\nProvjeri da `npm run dev` radi na http://127.0.0.1:" + port + "\n",
);
console.log(
  "Cloudflare tunel — drži ovaj terminal otvoren. URL će biti https://….trycloudflare.com\n",
);

const child = spawn(
  "cloudflared",
  ["tunnel", "--url", `http://127.0.0.1:${port}`],
  {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
