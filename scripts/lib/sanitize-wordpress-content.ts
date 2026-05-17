/**
 * Potpuna sanitizacija WordPress HTML/plain sadržaja prije upisa u Drizzle model
 * (@see lib/db/schema.ts — posts, post_translations).
 *
 * Manipuliše se `string` u Unicode-u (UTF-16 u Node-u; ulaz/izlaz UTF-8 na fajl i kroz mysql2
 * sa `utf8mb4` poolom) — bez pretvaranja bajtova koji bi pokvarili emoji ili hrvatsku abecedu.
 *
 * Env varijable (opciono, vidi sanitizeOptionsFromEnv()):
 * - MIGRATE_OLD_UPLOADS_PREFIX, MIGRATE_NEW_UPLOADS_PREFIX — uploads putanje
 * - MIGRATE_OLD_SITE_ORIGIN — pun origin starog sajta (npr. https://stari.com) za interne <a href>
 */

import { rewriteWpContentUploadUrls } from "./rewrite-wp-upload-urls";

export type SanitizeWordPressContentOptions = {
  /**
   * Pun origin starog sajta, bez završnog slash-a — za prepoznavanje internih linkova u <a href>.
   * Primjer: https://stari-sajt.com
   */
  oldSiteOrigin?: string;
  /** Primjer: https://stari-sajt.com/wp-content/uploads */
  oldUploadsPrefix?: string;
  /** Primjer: /uploads/ ili https://bucket.s3…/uploads/ */
  newUploadsPrefix?: string;
  /**
   * `html` — pun pipeline (podrazumijevano).
   * `plain` — bez HTML-specifičnih koraka koji bi pokvarili običan tekst (naslov, kratki meta string).
   */
  contentKind?: "html" | "plain";
};

/** Uobičajeni WordPress shortcode tagovi (whitelist da ne uklonimo markdown [link](url) ili [ISO 9001]). */
const WP_SHORTCODE_NAMES =
  "caption|wp_caption|gallery|embed|audio|video|playlist|shortcake|toc|sitemap|" +
  "contact-form-7|contact-form|formidable|gravityform|ngg_images|slides|" +
  "rev_slider|slider|layerslider|vc_row|vc_column|vc_btn|" +
  "instagram-feed|instagram|foo_gallery|foogallery|" +
  "chapters|latex|printfriendly";

function buildOldSiteHosts(origin: string): Set<string> {
  const hosts = new Set<string>();
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    hosts.add(h);
    hosts.add(h.replace(/^www\./, ""));
    hosts.add(`www.${h.replace(/^www\./, "")}`);
  } catch {
    /* ignorisati */
  }
  return hosts;
}

/**
 * Korak 2 — zaštita markdown linkova/slika da ne budu pogrešno tretirani kao shortcode.
 */
function protectMarkdown(html: string): { text: string; restore: () => string } {
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
    restore: () => {
      let out = text;
      for (let j = 0; j < chunks.length; j++) {
        out = out.replace(`\uE000MD${j}\uE001`, () => chunks[j]!);
      }
      return out;
    },
  };
}

/**
 * **Korak 2 (shortcode):** uklanja `[gallery]`, `[caption]…[/caption]` (unutrašnjost ostaje), itd.
 * Whitelist imena + zaštita markdown `[tekst](url)` preko {@link protectMarkdown}.
 */
function stripWordPressShortcodes(html: string): string {
  const paired = new RegExp(
    `\\[(${WP_SHORTCODE_NAMES})(?:\\s[^\\]]*)?\\]([\\s\\S]*?)\\[/\\1\\]`,
    "gi",
  );
  let s = html;
  for (let n = 0; n < 50; n++) {
    const next = s.replace(paired, "$2");
    if (next === s) break;
    s = next;
  }
  const selfClosing = new RegExp(
    `\\[(?:${WP_SHORTCODE_NAMES})(?:\\s[^\\]]*)?\\]`,
    "gi",
  );
  s = s.replace(selfClosing, "");
  /* Ostali nepoznati [plugin-foo …] često imaju bar jedan razmak ili kraće ime plugina */
  s = s.replace(
    /\[[a-z][a-z0-9_-]{2,}\s+[^\]]+\]/gi,
    "",
  );
  return s;
}

/**
 * **Korak 3 (Gutenberg):** briše `<!-- wp:… -->` komentare (uključujući blokove s JSON atributima).
 */
function stripGutenbergBlockComments(html: string): string {
  return html.replace(/<!--\s*wp:[\s\S]*?-->/gi, "");
}

/**
 * **Korak 4 (interni linkovi):** `<a href="https://stari…/putanja">` → `<a href="/putanja">`;
 * vanjski domeni ostaju netaknuti.
 */
function rewriteInternalAnchorsToRelative(
  html: string,
  oldSiteOrigin: string | undefined,
): string {
  if (!oldSiteOrigin?.trim()) return html;
  let base: URL;
  try {
    base = new URL(oldSiteOrigin.trim().replace(/\/+$/, ""));
  } catch {
    return html;
  }
  const hosts = buildOldSiteHosts(base.href);
  const schemes = ["http:", "https:"];
  return html.replace(
    /<a(\s+[^>]*?)\bhref\s*=\s*(["'])([^"']+)\2([^>]*)>/gi,
    (full, pre, _q, href, post) => {
      try {
        const u = new URL(href.trim(), base);
        if (!schemes.includes(u.protocol)) return full;
        if (!hosts.has(u.hostname.toLowerCase())) return full;
        let path = u.pathname || "/";
        if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
        const nextHref = `${path}${u.search}${u.hash}`;
        return `<a${pre}href="${nextHref}"${post}>`;
      } catch {
        return full;
      }
    },
  );
}

function shouldDropWpClassToken(token: string): boolean {
  const c = token.trim();
  if (!c) return true;
  if (c.startsWith("wp-")) return true;
  if (c === "alignleft" || c === "alignright" || c === "aligncenter" || c === "alignnone") {
    return true;
  }
  if (c.startsWith("has-text-align-")) return true;
  if (/^size-(large|medium|small|full|thumbnail)$/.test(c)) return true;
  if (/^attachment-[\w-]+$/.test(c)) return true;
  if (/^wp-image-\d+$/.test(c)) return true;
  return false;
}

/**
 * **Korak 5 (stilovi):** uklanja typične WP klase (`wp-block-*`, `align*`, `has-text-align-*`, …)
 * i **sve** `style="…"` atribute da ne sudare Tailwind layout.
 */
function stripConflictingClassesAndStyles(html: string): string {
  let out = html.replace(
    /\sclass\s*=\s*["']([^"']*)["']/gi,
    (_m, classList: string) => {
      const kept = classList
        .split(/\s+/)
        .filter((t: string) => !shouldDropWpClassToken(t));
      if (kept.length === 0) return "";
      return ` class="${kept.join(" ")}"`;
    },
  );
  out = out.replace(/\sclass\s*=\s*["']\s*["']/gi, "");
  out = out.replace(/\sstyle\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\sstyle\s*=\s*'[^']*'/gi, "");
  return out;
}

/**
 * **Korak 1 (mediji / domen):** `…/wp-content/uploads/…` → `/uploads/…` ili CDN (`rewriteWpContentUploadUrls`).
 */
function rewriteMediaUrls(
  html: string,
  oldUploadsPrefix: string | undefined,
  newUploadsPrefix: string | undefined,
): string {
  return rewriteWpContentUploadUrls(html, oldUploadsPrefix, newUploadsPrefix);
}

/**
 * Ako je u .env samo uploads prefiks, izvedi origin za interne linkove.
 */
export function inferOldSiteOriginFromEnv(): string | undefined {
  const explicit = process.env.MIGRATE_OLD_SITE_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const up = process.env.MIGRATE_OLD_UPLOADS_PREFIX?.trim();
  if (!up) return undefined;
  try {
    const u = new URL(up.startsWith("http") ? up : `https://${up}`);
    return u.origin;
  } catch {
    return undefined;
  }
}

export function sanitizeOptionsFromEnv(): SanitizeWordPressContentOptions {
  return {
    oldSiteOrigin: inferOldSiteOriginFromEnv(),
    oldUploadsPrefix: process.env.MIGRATE_OLD_UPLOADS_PREFIX,
    newUploadsPrefix: process.env.MIGRATE_NEW_UPLOADS_PREFIX,
  };
}

/**
 * Glavna funkcija: primjenjuje kuriranje WP sadržaja (pet zahtijeva u helperima 1–5).
 *
 * - **Korak 1:** zamjena starog uploads prefiksa novim (`/uploads/` ili CDN).
 * - **Korak 2:** shortcode-ovi (whitelist; markdown linkovi zaštićeni).
 * - **Korak 3:** Gutenberg `<!-- wp:… -->` komentari.
 * - **Korak 4:** interni `<a href>` sa starog hosta → relativno.
 * - **Korak 5:** uklanjanje WP klasa i svih `style=""` atributa.
 *
 * Redoslijed u HTML modu (namjerno): **3 → 2 → 1 → 4 → 5** (prvo Gutenberg omotači, pa shortcode,
 * pa zamjena URL-a, pa `<a href>`, pa klase/stilovi).
 */
export function sanitizeWordPressContent(
  rawContent: string,
  options: SanitizeWordPressContentOptions = {},
): string {
  if (rawContent == null || rawContent === "") return "";

  const kind = options.contentKind ?? "html";
  const oldOrigin = options.oldSiteOrigin ?? inferOldSiteOriginFromEnv();
  const oldUp = options.oldUploadsPrefix ?? process.env.MIGRATE_OLD_UPLOADS_PREFIX;
  const newUp =
    options.newUploadsPrefix ?? process.env.MIGRATE_NEW_UPLOADS_PREFIX ?? "/uploads/";

  if (kind === "plain") {
    let s = rawContent;
    /* U plain tekstu samo ukloni Gutenberg komentare ako su zalijepljeni */
    s = stripGutenbergBlockComments(s);
    const md = protectMarkdown(s);
    s = stripWordPressShortcodes(md.text);
    s = md.restore();
    s = rewriteMediaUrls(s, oldUp, newUp);
    s = s.replace(/<[^>]+>/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  let html = rawContent;

  // Korak 3: Gutenberg smeće prvo — često omata ostatak.
  html = stripGutenbergBlockComments(html);

  // Korak 2: shortcode + markdown zaštita
  const md = protectMarkdown(html);
  html = stripWordPressShortcodes(md.text);
  html = md.restore();

  // Korak 1: medijske putanje
  html = rewriteMediaUrls(html, oldUp, newUp);

  // Korak 4: interni linkovi
  html = rewriteInternalAnchorsToRelative(html, oldOrigin);

  // Korak 5: klase i inline stilovi
  html = stripConflictingClassesAndStyles(html);

  return html;
}
