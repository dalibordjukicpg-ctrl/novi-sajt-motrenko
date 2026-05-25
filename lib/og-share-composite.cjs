const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OG_W = 1200;
const OG_H = 630;
const BRAND_ORANGE = "#e8682a";

const COPY = {
  me: { tagline: "Reproduktivna medicina i IVF", city: "Budva" },
  en: { tagline: "Reproductive medicine and IVF", city: "Budva" },
  ru: { tagline: "Репродуктивная медицина и ЭКО", city: "Budva" },
};

/** Sharp/librsvg na Linuxu nema Segoe/Georgia — ugrađujemo TTF iz repoa. */
let embeddedFontDefs = null;

function loadFontBase64(filename) {
  const p = path.join(process.cwd(), "public", "fonts", "pdf", filename);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p).toString("base64");
}

function getEmbeddedFontDefs() {
  if (embeddedFontDefs) return embeddedFontDefs;

  const sans = loadFontBase64("DejaVuSans.ttf");
  const display = loadFontBase64("DejaVuSans-Oblique.ttf");
  if (!sans || !display) {
    embeddedFontDefs = "";
    return embeddedFontDefs;
  }

  embeddedFontDefs = `<defs>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: 'OgSans';
        src: url('data:font/ttf;base64,${sans}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'OgDisplay';
        src: url('data:font/ttf;base64,${display}') format('truetype');
        font-weight: normal;
        font-style: oblique;
      }
    ]]></style>
  </defs>`;
  return embeddedFontDefs;
}

function readIfExists(relPaths) {
  for (const rel of relPaths) {
    const p = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
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
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
    ${getEmbeddedFontDefs()}
    <line x1="390" y1="472" x2="548" y2="472" stroke="rgba(232,104,42,0.38)" stroke-width="1"/>
    <line x1="652" y1="472" x2="810" y2="472" stroke="rgba(232,104,42,0.38)" stroke-width="1"/>
    <path fill="${BRAND_ORANGE}" d="M600 487 L588.5 475.5C582 469 578 463 578 457c0-6 4.8-10.8 10.8-10.8 3.4 0 6.6 1.6 8.7 4.1 2.1-2.5 5.3-4.1 8.7-4.1 6 0 10.8 4.8 10.8 10.8 0 6-4 12-10.5 18.5L600 487z"/>
    <text x="600" y="512" text-anchor="middle" font-family="OgSans, sans-serif" font-size="24" fill="#5c4a3a" letter-spacing="0.6">${esc(copy.tagline)}</text>
    <text x="600" y="568" text-anchor="middle" font-family="OgDisplay, serif" font-size="58" font-style="oblique" fill="${BRAND_ORANGE}" letter-spacing="3">${esc(copy.city)}</text>
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
