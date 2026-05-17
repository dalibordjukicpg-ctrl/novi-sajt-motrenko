/**
 * Javni URL ka lokalnom `npm run dev` (bez Vercel-a / cloud MySQL-a).
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
console.log("Pokrećem tunel (localtunnel) …\n");

const child = spawn(
  "npx",
  ["-y", "localtunnel", "--port", port],
  {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
