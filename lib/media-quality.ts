import fs from "fs";
import path from "path";

const WP_SIZE_SUFFIX = /-\d+x\d+(?=\.[a-z0-9]+$)/i;

/** Uklanja WordPress sufiks dimenzija (`-200x300`, `-1024x768`, `-scaled`). */
export function stripWordPressImageSizeSuffix(urlOrPath: string): string {
  const u = urlOrPath.trim();
  if (!u) return u;
  const q = u.indexOf("?");
  const base = q >= 0 ? u.slice(0, q) : u;
  const query = q >= 0 ? u.slice(q) : "";
  const stripped = base
    .replace(WP_SIZE_SUFFIX, "")
    .replace(/-scaled(?=\.[a-z0-9]+$)/i, "");
  return `${stripped}${query}`;
}

function imageStemForLookup(urlOrPath: string): string {
  let file = (urlOrPath.split("/").filter(Boolean).pop() ?? urlOrPath).toLowerCase();
  file = file.replace(/^[a-f0-9]{8,12}_/i, "");
  file = file.replace(WP_SIZE_SUFFIX, "");
  file = file.replace(/-scaled(?=\.[a-z0-9]+$)/i, "");
  return file;
}

type WpMediaEntry = { url: string; size: number };

let wpMediaByStem: Map<string, WpMediaEntry> | null = null;

function wpMediaIndex(): Map<string, WpMediaEntry> {
  if (wpMediaByStem) return wpMediaByStem;

  wpMediaByStem = new Map();
  const dir = path.join(process.cwd(), "public", "wp-media");
  if (!fs.existsSync(dir)) return wpMediaByStem;

  for (const name of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) continue;
    const stem = imageStemForLookup(name);
    if (!stem) continue;
    const abs = path.join(dir, name);
    let size = 0;
    try {
      size = fs.statSync(abs).size;
    } catch {
      continue;
    }
    const url = `/wp-media/${name}`;
    const prev = wpMediaByStem.get(stem);
    if (!prev || size > prev.size) {
      wpMediaByStem.set(stem, { url, size });
    }
  }

  return wpMediaByStem;
}

function publicFileExists(relUrl: string): boolean {
  if (!relUrl.startsWith("/")) return false;
  return fs.existsSync(path.join(process.cwd(), "public", relUrl.replace(/^\//, "")));
}

/**
 * Biraj najveću dostupnu verziju slike (puna umjesto WP thumbnaila).
 * Koristiti za portrete tima i cover fotografije.
 */
export function resolveBestPublicImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  const original = url.trim();

  if (original.startsWith("http://") || original.startsWith("https://")) {
    const stripped = stripWordPressImageSizeSuffix(original);
    return stripped || original;
  }

  if (!original.startsWith("/")) return original;

  /** Uploads i ostalo — tačna putanja, bez zamjene wp-media varijantom. */
  if (!original.startsWith("/wp-media/")) {
    if (publicFileExists(original)) return original;
    return original;
  }

  const stem = imageStemForLookup(original);
  const indexed = wpMediaIndex().get(stem);

  if (indexed && indexed.size > 0) {
    return indexed.url;
  }

  const stripped = stripWordPressImageSizeSuffix(original);
  if (publicFileExists(stripped)) return stripped;
  if (publicFileExists(original)) return original;

  return stripped || original;
}

/** Zamijeni src u HTML-u punom verzijom kad postoji u wp-media. */
export function upgradeImageUrlsInHtml(html: string): string {
  return html.replace(
    /(<img\b[^>]*\bsrc=)(["'])([^"']+)\2/gi,
    (full, prefix, quote, src) => {
      const best = resolveBestPublicImageUrl(src);
      if (!best || best === src) return full;
      return `${prefix}${quote}${best}${quote}`;
    },
  );
}
