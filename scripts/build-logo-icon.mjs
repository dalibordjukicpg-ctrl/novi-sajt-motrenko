/**
 * Samo narandžasta ikona iz logotipa (transparentna pozadina).
 */
import fs from "node:fs";
import sharp from "sharp";

const input = "public/logo-hrc-budva.png";
const output = "public/logo-hrc-budva-icon.png";
const ICON_CUT_X = 0.34;

function isBackground(r, g, b) {
  const avg = (r + g + b) / 3;
  if (avg > 52) return false;
  if (r > 100) return false;
  return true;
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const cut = Math.round(w * ICON_CUT_X);
const pixels = w * h;

const seen = new Uint8Array(pixels);
const q = [];
function pushIf(pi) {
  if (pi < 0 || pi >= pixels || seen[pi]) return;
  const o = pi * 4;
  if (!isBackground(data[o], data[o + 1], data[o + 2])) return;
  seen[pi] = 1;
  q.push(pi);
}
for (let x = 0; x < w; x++) {
  pushIf(x);
  pushIf((h - 1) * w + x);
}
for (let y = 0; y < h; y++) {
  pushIf(y * w);
  pushIf(y * w + (w - 1));
}
while (q.length) {
  const pi = q.pop();
  const x = pi % w;
  const y = (pi / w) | 0;
  if (x > 0) pushIf(pi - 1);
  if (x < w - 1) pushIf(pi + 1);
  if (y > 0) pushIf(pi - w);
  if (y < h - 1) pushIf(pi + w);
}

for (let pi = 0; pi < pixels; pi++) {
  const o = pi * 4;
  const x = pi % w;
  if (seen[pi] || x >= cut) data[o + 3] = 0;
}

const buf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: 0, top: 0, width: cut, height: h })
  .trim()
  .png({ compressionLevel: 9 })
  .toBuffer();

fs.writeFileSync(output, buf);
console.log("written", output);
