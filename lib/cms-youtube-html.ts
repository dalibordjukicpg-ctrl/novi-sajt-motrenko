import {
  extractYoutubeVideoIdFromNoisyText,
  findYoutubeEmbedInNoisyText,
  parseYoutubeEmbedUrl,
} from "@/lib/youtube-hero";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** Kanonski watch URL za čuvanje u CMS-u i `data-youtube-url`. */
export function canonicalYoutubeWatchUrl(raw: string): string | null {
  const id = extractYoutubeVideoIdFromNoisyText(raw);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

/** Javni i admin embed blok — urediv preko `data-youtube-url`. */
export function buildCmsYoutubeEmbedHtml(watchUrl: string): string {
  const canonical = canonicalYoutubeWatchUrl(watchUrl);
  if (!canonical) return "";
  const embed =
    parseYoutubeEmbedUrl(canonical) ?? findYoutubeEmbedInNoisyText(canonical);
  if (!embed) return "";
  return [
    `<div class="wp-youtube-embed" data-youtube-url="${escapeHtmlAttr(canonical)}">`,
    `<iframe src="${embed}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
    "</div>",
  ].join("");
}

const YOUTUBE_URL_NOISE_RE =
  /n*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}n*/gi;

function ensureDataUrlOnExistingEmbeds(html: string): string {
  return html.replace(
    /<div\b([^>]*class=["'][^"']*wp-youtube-embed[^"']*["'][^>]*)>([\s\S]*?)<\/div>/gi,
    (full, attrs: string, inner: string) => {
      if (/data-youtube-url=/i.test(attrs)) return full;
      const iframeSrc = /<iframe\b[^>]*\bsrc=(["'])([^"']+)\1/i.exec(inner)?.[2];
      const watch =
        (iframeSrc && canonicalYoutubeWatchUrl(iframeSrc)) ||
        (inner && canonicalYoutubeWatchUrl(plainTextFromHtmlFragment(inner)));
      if (!watch) return full;
      const block = buildCmsYoutubeEmbedHtml(watch);
      return block || full;
    },
  );
}

function plainTextFromHtmlFragment(inner: string): string {
  return inner
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&#(?:x6e|110);/gi, "n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blockIsOnlyYoutubeLink(plain: string): boolean {
  const embed = findYoutubeEmbedInNoisyText(plain);
  if (!embed) return false;
  const remainder = plain
    .replace(YOUTUBE_URL_NOISE_RE, "")
    .replace(/&#(?:x6e|110);/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "")
    .replace(/n+/gi, "")
    .trim();
  return remainder.length === 0;
}

/** WP Gutenberg figure omotač oko YouTube videa → čist embed blok za editor. */
function unwrapYoutubeFigures(html: string): string {
  return html.replace(
    /<figure\b[^>]*\bis-(?:type-video|provider-youtube)[^>]*>([\s\S]*?)<\/figure>/gi,
    (_full, inner: string) => {
      const embedMatch = inner.match(
        /<div\b[^>]*class=["'][^"']*wp-youtube-embed[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
      );
      if (embedMatch?.[0]) return embedMatch[0];
      const plain = plainTextFromHtmlFragment(inner);
      const watch = canonicalYoutubeWatchUrl(plain);
      return watch ? buildCmsYoutubeEmbedHtml(watch) : inner.trim();
    },
  );
}

/** Prije učitavanja u TipTap: plain/noisy linkove pretvori u uredive embed blokove. */
export function normalizeCmsHtmlForEditor(html: string | null | undefined): string {
  if (!html) return "";
  let out = unwrapYoutubeFigures(ensureDataUrlOnExistingEmbeds(html));

  const blockTags = ["p", "li", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
  for (const tag of blockTags) {
    out = out.replace(
      new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "gi"),
      (full, attrs: string, inner: string) => {
        if (/wp-youtube-embed|data-youtube-url/i.test(inner)) return full;
        const plain = plainTextFromHtmlFragment(inner);
        if (!blockIsOnlyYoutubeLink(plain)) return full;
        const watch = canonicalYoutubeWatchUrl(plain);
        if (!watch) return full;
        return buildCmsYoutubeEmbedHtml(watch);
      },
    );
  }

  out = out.replace(
    /<p\b[^>]*>\s*(<div class="wp-youtube-embed"[\s\S]*?<\/div>)\s*<\/p>/gi,
    "$1",
  );

  return out;
}

/** Prije snimanja / na javnom sajtu: osiguraj iframe u embed blokovima. */
export function ensureYoutubeEmbedsInCmsHtml(html: string): string {
  if (!html) return html;

  let out = html.replace(
    /<div\b([^>]*)\bdata-youtube-url=(["'])([^"']+)\2([^>]*)>([\s\S]*?)<\/div>/gi,
    (_full, _a1: string, _q: string, watchUrl: string) => {
      const decoded = watchUrl
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
      return buildCmsYoutubeEmbedHtml(decoded);
    },
  );

  out = ensureDataUrlOnExistingEmbeds(out);
  return out;
}

/** Zamijeni postojeći YouTube link u HTML-u novim kanonskim embedom. */
export function replaceYoutubeLinkInHtml(
  html: string,
  watchUrl: string,
): string {
  const block = buildCmsYoutubeEmbedHtml(watchUrl);
  if (!block) return html;

  if (!html.trim()) return block;

  let replaced = false;
  let out = html.replace(YOUTUBE_URL_NOISE_RE, () => {
    replaced = true;
    return `__YOUTUBE_EMBED__`;
  });

  out = out.replace(
    /<div\b[^>]*class=["'][^"']*wp-youtube-embed[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    () => {
      replaced = true;
      return `__YOUTUBE_EMBED__`;
    },
  );

  if (!replaced) {
    return `${html.trim()}\n${block}`;
  }

  out = out.replace(/__YOUTUBE_EMBED__/g, block);
  out = out.replace(
    /<p\b[^>]*>\s*(<div class="wp-youtube-embed"[\s\S]*?<\/div>)\s*<\/p>/gi,
    "$1",
  );
  return out;
}
