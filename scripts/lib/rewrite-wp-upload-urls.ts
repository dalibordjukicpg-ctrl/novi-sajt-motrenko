/**
 * Zamjena prefiksa starog WordPress uploads URL-a u HTML-u (post_content itd.).
 * Primjer: https://stari-sajt.com/wp-content/uploads/... → /uploads/... ili S3 prefiks.
 */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Varijante http/https i sa/bez završnog slash-a. */
function oldPrefixVariants(oldPrefix: string): string[] {
  const t = oldPrefix.trim().replace(/\/+$/, "");
  const out = new Set<string>();
  for (const base of [t, t.replace("https://", "http://")]) {
    out.add(base);
    out.add(`${base}/`);
  }
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    const host = u.hostname;
    if (host.startsWith("www.")) {
      const bare = `${u.protocol}//${host.slice(4)}${u.pathname}`.replace(
        /\/+$/,
        "",
      );
      out.add(bare);
      out.add(`${bare}/`);
    } else {
      const www = `${u.protocol}//www.${host}${u.pathname}`.replace(/\/+$/, "");
      out.add(www);
      out.add(`${www}/`);
    }
  } catch {
    /* ignorisati ako nije pun URL */
  }
  return [...out];
}

/**
 * @param oldPrefix npr. https://stari-sajt.com/wp-content/uploads (ili sa / na kraju)
 * @param newPrefix npr. /uploads/ ili https://moj-bucket.s3.eu-central-1.amazonaws.com/uploads/
 */
export function rewriteWpContentUploadUrls(
  html: string,
  oldPrefix: string | undefined,
  newPrefix: string | undefined,
): string {
  if (!html || !oldPrefix?.trim() || !newPrefix?.trim()) return html;

  const replacement = newPrefix.trim().replace(/\/?$/, "/");
  const variants = oldPrefixVariants(oldPrefix);

  let out = html;
  for (const v of variants.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(escapeRegExp(v), "gi");
    out = out.replace(re, replacement);
  }
  return out;
}
