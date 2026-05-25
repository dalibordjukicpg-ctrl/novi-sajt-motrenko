/**
 * Kopira DejaVu TTF u public/fonts/pdf — pouzdano na Hostingeru i bez node_modules putanje.
 */
const fs = require("fs");
const path = require("path");

const NAMES = [
  "DejaVuSans.ttf",
  "DejaVuSans-Bold.ttf",
  "DejaVuSans-Oblique.ttf",
];

function resolvePackageDir() {
  try {
    const pkg = require.resolve("dejavu-fonts-ttf/package.json");
    return path.join(path.dirname(pkg), "ttf");
  } catch {
    return null;
  }
}

function main() {
  const srcDir = resolvePackageDir();
  if (!srcDir) {
    console.warn("[copy-pdf-fonts] dejavu-fonts-ttf nije instaliran — preskačem.");
    return;
  }

  const destDir = path.join(process.cwd(), "public", "fonts", "pdf");
  fs.mkdirSync(destDir, { recursive: true });

  for (const name of NAMES) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    if (!fs.existsSync(src)) {
      console.warn("[copy-pdf-fonts] nedostaje", src);
      continue;
    }
    fs.copyFileSync(src, dest);
  }

  console.log("[copy-pdf-fonts] ok →", destDir);
}

main();
