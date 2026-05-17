/**
 * One-off: povezana crna pozadina (od ivica) → transparentno.
 * Ne dira npr. narandžasto; tamno sivo tekst ostaje ako nije spojeno s ivicom kroz crnilo.
 */
import fs from "node:fs";
import sharp from "sharp";

const input = "public/logo-hrc-budva.png";
const output = "public/logo-hrc-budva.png";

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const pixels = w * h;

/** Pozadina: tamno i bez dominantno narandžastog (visok R niski G/B). */
function isBackground(pi) {
  const o = pi * 4;
  const r = data[o];
  const g = data[o + 1];
  const b = data[o + 2];
  const avg = (r + g + b) / 3;
  if (avg > 52) return false;
  if (r > 100) return false;
  return true;
}

const seen = new Uint8Array(pixels);
const q = [];

function pushIf(pi) {
  if (pi < 0 || pi >= pixels || seen[pi]) return;
  if (!isBackground(pi)) return;
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

let cleared = 0;
for (let pi = 0; pi < pixels; pi++) {
  if (!seen[pi]) continue;
  const o = pi * 4;
  data[o + 3] = 0;
  cleared++;
}

const buf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toBuffer();

const finalBuf = await sharp(buf).trim().png({ compressionLevel: 9 }).toBuffer();

fs.writeFileSync(output, finalBuf);
console.log("cleared pixels", cleared, "written", output);

const m = await sharp(output).metadata();
console.log("final size", m.width, m.height);
