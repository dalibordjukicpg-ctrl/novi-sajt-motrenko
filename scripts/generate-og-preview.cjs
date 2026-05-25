/**
 * Generiše OG preview PNG za ručnu provjeru.
 * Usage: node scripts/generate-og-preview.cjs
 */
const { buildOgSharePngBuffer } = require("../lib/og-share-composite.cjs");
const fs = require("fs");
const path = require("path");

(async () => {
  const buf = await buildOgSharePngBuffer("me");
  const out = path.join(process.cwd(), "public", "og-share-preview-me.png");
  fs.writeFileSync(out, buf);
  console.log("written", out, buf.length, "bytes");
})();
