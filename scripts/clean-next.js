const fs = require("fs");
const path = require("path");

/**
 * Ne pokretati dok `npm run dev` radi u drugom terminalu — obrisan `.next` u hodu
 * lomi Next (ENOENT routes-manifest.json, Internal Server Error).
 */
const root = process.cwd();
const dirs = [".next", path.join("node_modules", ".cache")];

for (const rel of dirs) {
  const full = path.join(root, rel);
  try {
    fs.rmSync(full, { recursive: true, force: true });
    console.log("Uklonjeno:", rel);
  } catch (_) {
    /* npr. ne postoji */
  }
}
