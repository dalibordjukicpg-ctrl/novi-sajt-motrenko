/**
 * Javni URL ka lokalnom `npm run dev`.
 *
 * 1) U jednom terminalu: npm run dev
 * 2) U drugom: npm run share:dev
 *
 * Štampa HTTPS link; po potrebi na prvom otvaranju localtunnel pokaže upozorenje — klik “Continue”.
 */
const { spawn } = require("child_process");
const path = require("path");

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  override: true,
});

const port = process.env.DEV_PORT?.trim() || "7392";

console.log(
  "\nProvjeri da `npm run dev` radi na http://localhost:" + port + "\n",
);
console.log(
  "Sa telefona (čak i na mobilnim podacima) koristi HTTPS link ispod nakon što se pojavi.\n",
);
console.log(
  "VAŽNO: Drži ovaj terminal otvoren — ako se vratiš na prompt, tunel je ugasen.\n",
);
console.log(
  "Ako stranica ne učita: (1) u drugom terminalu MORA raditi `npm run dev`\n" +
    "  (2) na loca.lt prvom otvaranju klikni „Continue“\n" +
    "  (3) u .env privremeno stavi NEXT_PUBLIC_SITE_URL=isti-https-link-bez-/ (pa restart dev)\n" +
    "  (4) probaj `npm run share:dev:cf` ako localtunnel zakaže (potreban cloudflared)\n",
);
console.log("Pokrećem tunel (localtunnel) …\n");

const child = spawn(
  "npx",
  [
    "-y",
    "localtunnel",
    "--port",
    port,
    /** Izbjegni IPv6 / „connection refused“ na nekim Windows instalacijama */
    "--local-host",
    "127.0.0.1",
  ],
  {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
