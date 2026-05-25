/**
 * WordPress shortcode-ovi u migrisanom HTML/plain sadržaju.
 * Ne prikazivati korisniku; ukloniti pri renderu.
 */

/** Zaštiti markdown [tekst](url) prije agresivnog uklanjanja […]. */
function protectMarkdownLinks(html: string): {
  text: string;
  restore: (s: string) => string;
} {
  const chunks: string[] = [];
  const reMd = /!?\[[^\]]*\]\([^)]*\)/g;
  let i = 0;
  const text = html.replace(reMd, (m) => {
    const token = `\uE000MD${i}\uE001`;
    chunks.push(m);
    i++;
    return token;
  });
  return {
    text,
    restore: (s: string) => {
      let out = s;
      for (let j = 0; j < chunks.length; j++) {
        out = out.replace(`\uE000MD${j}\uE001`, () => chunks[j]!);
      }
      return out;
    },
  };
}

/** Poznati WP tagovi gdje unutrašnjost ostaje (npr. caption). */
const PAIRED_KEEP_INNER =
  "caption|wp_caption|gallery|embed|audio|video|playlist|contact-form-7|contact-form";

/** Self-closing / staff grid / generički plugin shortcode. */
const SELF_CLOSING =
  "the-post-grid|the_post_grid|post-grid|gallery|embed|audio|video|playlist|" +
  "contact-form-7|contact-form|formidable|gravityform|ngg_images|slides|" +
  "rev_slider|slider|layerslider|vc_row|vc_column|vc_btn|instagram-feed|instagram|" +
  "foo_gallery|foogallery|chapters|latex|printfriendly|sitemap|toc|shortcake";

function decodeShortcodeEntities(html: string): string {
  return html
    .replace(/&#91;|&lsqb;|&#x5b;/gi, "[")
    .replace(/&#93;|&rsqb;|&#x5d;/gi, "]");
}

/**
 * Uklanja WordPress shortcode iz HTML/plain teksta.
 * Primjeri: [the-post-grid …], [gallery …], [contact-form-7 …]
 */
export function stripWordPressShortcodesFromContent(html: string): string {
  let s = decodeShortcodeEntities(html);

  s = s.replace(/<!--\s*\/?wp:shortcode[^>]*-->/gi, "");

  /** WP Gutenberg omotač oko shortcode-a: n[plugin …]n */
  s = s.replace(/n\s*(?=\[[a-z][a-z0-9_-]*)/gi, "");
  s = s.replace(/(?<=\])\s*n(?=\s*(?:<!--|<|$))/gi, "");

  const md = protectMarkdownLinks(s);
  s = md.text;

  const paired = new RegExp(
    `\\[(${PAIRED_KEEP_INNER})(?:\\s[^\\]]*)?\\]([\\s\\S]*?)\\[/\\1\\]`,
    "gi",
  );
  for (let n = 0; n < 50; n++) {
    const next = s.replace(paired, "$2");
    if (next === s) break;
    s = next;
  }

  const selfClosing = new RegExp(
    `\\[(?:${SELF_CLOSING})(?:\\s[^\\]]*)?\\]`,
    "gi",
  );
  s = s.replace(selfClosing, "");

  /** Generički WP plugin shortcode — tag počinje malim slovom (ne dira [ISO 9001]). */
  s = s.replace(/\[[a-z][a-z0-9_-]{2,}(?:\s[^\]]*)?\]/g, "");

  s = md.restore(s);

  s = s
    .replace(/<p[^>]*>\s*<\/p>/gi, "")
    .replace(/<p[^>]*>\s*(?:<br\s*\/?>\s*)+<\/p>/gi, "");

  return s;
}

/** The Post Grid / osoblje — zamijeniti React roster komponentom. */
export function containsStaffPostGridShortcode(content: string | null | undefined): boolean {
  if (!content?.trim()) return false;
  const s = decodeShortcodeEntities(content);
  return (
    /\[the[_-]?post[_-]?grid\b[^\]]*\]/i.test(s) ||
    /title\s*=\s*["'][^"']*osoblje[^"']*["']/i.test(s) ||
    /osoblje\s+post\s+grid/i.test(s)
  );
}
