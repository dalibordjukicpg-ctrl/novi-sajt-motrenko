const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");
const sharp = require("sharp");

const OG_W = 1200;
const OG_H = 630;
const BRAND_ORANGE = "#e8682a";

const COPY = {
  me: { tagline: "Reproduktivna medicina i IVF", city: "Budva" },
  en: { tagline: "Reproductive medicine and IVF", city: "Budva" },
  ru: { tagline: "Репродуктивная медицина и ЭКО", city: "Budva" },
};

let sansFont = null;
let displayFont = null;

function loadOpenTypeFont(filename) {
  const p = path.join(process.cwd(), "public", "fonts", "pdf", filename);
  if (!fs.existsSync(p)) {
    console.warn("[og-share] font missing:", p);
    return null;
  }
  try {
    return opentype.parse(fs.readFileSync(p));
  } catch (e) {
    console.warn("[og-share] font load failed:", p, e);
    return null;
  }
}

function getSansFont() {
  if (!sansFont) sansFont = loadOpenTypeFont("DejaVuSans.ttf");
  return sansFont;
}

function getDisplayFont() {
  if (!displayFont) displayFont = loadOpenTypeFont("DejaVuSans-Oblique.ttf");
  return displayFont;
}

function readIfExists(relPaths) {
  for (const rel of relPaths) {
    const p = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * SVG <text> + @font-face na Linuxu (librsvg/sharp) često daju „kineska“ kvadratića.
 * Konvertujemo tekst u <path> preko TTF — radi na Hostingeru bez sistemskih fontova.
 */
function centeredTextPaths(font, text, centerX, baselineY, fontSize, letterSpacingPx = 0) {
  if (!font || !text) return "";

  const scale = fontSize / font.unitsPerEm;
  const advances = [];
  let totalWidth = 0;

  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const w = (glyph.advanceWidth ?? font.unitsPerEm) * scale;
    advances.push(w);
    totalWidth += w;
  }
  if (text.length > 1) {
    totalWidth += letterSpacingPx * (text.length - 1);
  }

  let x = centerX - totalWidth / 2;
  const parts = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const glyphPath = font.getPath(ch, x, baselineY, fontSize);
    const svg = glyphPath.toSVG(2);
    parts.push(svg.startsWith("<path ") ? svg : `<path d="${glyphPath.toPathData(2)}"/>`);
    x += advances[i] + letterSpacingPx;
  }

  return parts.join("");
}

function pathsWithFill(paths, fill) {
  if (!paths) return "";
  return paths.replace(/<path /g, `<path fill="${fill}" `);
}

/** Korisnička pozadina — cover + 10% bijeli overlay (izbijeli). */
async function composeBackdrop() {
  const bgPath = readIfExists(["og-share-bg.png"]);
  if (!bgPath) {
    return sharp({
      create: {
        width: OG_W,
        height: OG_H,
        channels: 4,
        background: { r: 253, g: 250, b: 246, alpha: 255 },
      },
    })
      .png()
      .toBuffer();
  }

  const photo = await sharp(bgPath)
    .resize(OG_W, OG_H, { fit: "cover", position: "right" })
    .toBuffer();

  const fade10 = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}"><rect width="100%" height="100%" fill="white" opacity="0.10"/></svg>`,
  );

  return sharp(photo)
    .composite([{ input: fade10, top: 0, left: 0, blend: "over" }])
    .png()
    .toBuffer();
}

function textOverlaySvg(copy) {
  const taglinePaths = centeredTextPaths(
    getSansFont(),
    copy.tagline,
    600,
    512,
    24,
    0.6,
  );
  const cityPaths = centeredTextPaths(
    getDisplayFont(),
    copy.city,
    600,
    568,
    58,
    3,
  );

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
    <line x1="390" y1="472" x2="548" y2="472" stroke="rgba(232,104,42,0.38)" stroke-width="1"/>
    <line x1="652" y1="472" x2="810" y2="472" stroke="rgba(232,104,42,0.38)" stroke-width="1"/>
    <path fill="${BRAND_ORANGE}" d="M600 487 L588.5 475.5C582 469 578 463 578 457c0-6 4.8-10.8 10.8-10.8 3.4 0 6.6 1.6 8.7 4.1 2.1-2.5 5.3-4.1 8.7-4.1 6 0 10.8 4.8 10.8 10.8 0 6-4 12-10.5 18.5L600 487z"/>
    ${pathsWithFill(taglinePaths, "#5c4a3a")}
    ${pathsWithFill(cityPaths, BRAND_ORANGE)}
  </svg>`);
}

async function buildOgSharePngBuffer(locale = "me") {
  const copy = COPY[locale] ?? COPY.me;
  const backdrop = await composeBackdrop();

  const logoPath = readIfExists([
    "uploads/c76590fc-39ea-4868-94ef-3a3c9d5d3b9c.png",
    "logo-hrc-budva.png",
  ]);

  const layers = [];

  if (logoPath) {
    const logoBuf = await sharp(logoPath)
      .resize(980, 380, { fit: "inside" })
      .ensureAlpha()
      .toBuffer();
    const logoMeta = await sharp(logoBuf).metadata();
    const lw = logoMeta.width ?? 980;
    const lh = logoMeta.height ?? 380;
    layers.push({
      input: logoBuf,
      top: Math.round(72 + (380 - lh) / 2),
      left: Math.round((OG_W - lw) / 2),
    });
  }

  layers.push({ input: textOverlaySvg(copy), top: 0, left: 0 });

  return sharp(backdrop).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

module.exports = { buildOgSharePngBuffer, OG_W, OG_H };
