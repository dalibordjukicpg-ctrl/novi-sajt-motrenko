import { sanitizeWordPressContent } from "@/scripts/lib/sanitize-wordpress-content";
import { stripWordPressShortcodesFromContent } from "@/lib/wordpress-shortcodes";
import { upgradeImageUrlsInHtml } from "@/lib/media-quality";
import {
  buildCmsYoutubeEmbedHtml,
  ensureYoutubeEmbedsInCmsHtml,
  normalizeCmsHtmlForEditor,
  unwrapYoutubeFigureWrappers,
} from "@/lib/cms-youtube-html";
import {
  extractYoutubeVideoIdFromNoisyText,
  findYoutubeEmbedInNoisyText,
  parseYoutubeEmbedUrl,
} from "@/lib/youtube-hero";

import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

/** HTML iz CMS-a (TipTap) — isti SSOT pipeline kao migracija, bez env prefiksa. */
export function sanitizePublicCmsHtml(html: string | null | undefined): string {
  if (html == null || html === "") return "";
  return sanitizeWordPressContent(html, { contentKind: "html" });
}

/**
 * WP uvoz / stari HTML često imaju `href="/posts/slug"` ili `href="/s/slug"` bez jezika.
 * U App Routeru su rute `/[locale]/posts/...` i `/[locale]/s/...` — ovaj korak ih usklađuje.
 */
export function prefixRootRelativeAppLinks(html: string, locale: Locale): string {
  if (!html) return html;
  return html.replace(
    /href=(["'])\/(posts\/[^"'#\s]*|s\/[^"'#\s]*)/gi,
    (full, quote, path) => {
      const first = path.split("/")[0];
      if (locales.includes(first as Locale)) return full;
      return `href=${quote}/${locale}/${path}`;
    },
  );
}

const IMG_URL_ATTRS = [
  "src",
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-full-url",
  "data-old-href",
  "data-large-file",
] as const;

function extractUrlsFromImgTag(tag: string): string[] {
  const urls: string[] = [];
  for (const attr of IMG_URL_ATTRS) {
    const re = new RegExp(`\\b${attr}=(["'])([^"']*)\\1`, "i");
    const m = re.exec(tag);
    if (m?.[2]?.trim()) urls.push(m[2]!.trim());
  }
  const setM = /\bsrcset=(["'])([^"']*)\1/i.exec(tag);
  if (setM?.[2]) {
    for (const part of setM[2].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.push(u);
    }
  }
  return urls;
}

function imgTagReferencesCover(tag: string, coverUrl: string): boolean {
  return extractUrlsFromImgTag(tag).some((u) =>
    imagePathsComparable(u, coverUrl),
  );
}

function normalizePublicSrc(raw: string): string {
  const s = raw
    .trim()
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&");
  if (!s) return "";
  if (s.startsWith("//")) {
    try {
      return decodeURIComponent(new URL(`https:${s}`).pathname).toLowerCase();
    } catch {
      return s.toLowerCase();
    }
  }
  if (/^https?:\/\//i.test(s)) {
    try {
      return decodeURIComponent(new URL(s).pathname).toLowerCase();
    } catch {
      return s.toLowerCase();
    }
  }
  const pathOnly = s.split("?")[0] ?? s;
  try {
    return decodeURIComponent(pathOnly).toLowerCase();
  } catch {
    return pathOnly.toLowerCase();
  }
}

/** Prvi <img src> iz HTML-a (fallback portreta tima kad nema cover_media_id). */
export function extractFirstImageSrcFromHtml(
  html: string | null | undefined,
): string | null {
  if (!html) return null;
  const m = html.match(/<img\b[^>]*\bsrc=(["'])([^"']+)\1/i);
  const src = m?.[2]?.trim();
  return src || null;
}

/** WP uvoz: različit hash prefiks ili `-1024x768` varijanta = ista fotografija. */
function filenameStemForCompare(path: string): string {
  let file = (path.split("/").filter(Boolean).pop() ?? path).toLowerCase();
  const wpHash = file.match(/^[a-f0-9]{8,12}_(.+)$/i);
  if (wpHash?.[1]) file = wpHash[1];
  file = file.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
  file = file.replace(/-scaled(?=\.[a-z0-9]+$)/i, "");
  return file;
}

function imagePathsComparable(a: string, b: string): boolean {
  const na = normalizePublicSrc(a);
  const nb = normalizePublicSrc(b);
  if (na === nb) return true;
  const fa = na.split("/").filter(Boolean).pop() ?? na;
  const fb = nb.split("/").filter(Boolean).pop() ?? nb;
  if (fa === fb && fa.length > 3) return true;
  const sa = filenameStemForCompare(fa);
  const sb = filenameStemForCompare(fb);
  return sa === sb && sa.length > 3;
}

/** Ostatak teksta u bloku nakon uklanjanja slika. */
function residualTextLengthWithoutImgs(block: string): number {
  const noImg = block.replace(/<img\b[^>]*>/gi, "");
  const noScripts = noImg.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const plain = noScripts.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length;
}

function blockIsDuplicateCoverOnly(block: string, coverUrl: string): boolean {
  const tags = [...block.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  if (tags.length === 0) return false;
  if (!tags.every((tag) => imgTagReferencesCover(tag, coverUrl))) return false;
  /* Dupla slika često u istom bloku sa „n“/razmakom iz WP-a — dozvoli duži ostatak */
  if (residualTextLengthWithoutImgs(block) > 400) return false;
  return true;
}

function pIsOnlyCoverImg(inner: string, coverUrl: string): boolean {
  const innerNoSpan = inner.replace(/<\/?span\b[^>]*>/gi, "");
  if (
    !/^[\s\u00a0]*(?:<br\s*\/?>|&nbsp;)*[\s\u00a0]*<img\b[^>]+>[\s\u00a0]*(?:<br\s*\/?>|&nbsp;)*[\s\u00a0]*$/i.test(
      innerNoSpan,
    )
  ) {
    return false;
  }
  const tags = [...inner.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  if (tags.length !== 1) return false;
  return imgTagReferencesCover(tags[0]!, coverUrl);
}

function scrubEmptyWrappers(html: string): string {
  let prev = "";
  let out = html;
  let guard = 0;
  while (prev !== out && guard++ < 30) {
    prev = out;
    out = out
      .replace(/<p[^>]*>\s*<\/p>/gi, "")
      .replace(/<p[^>]*>\s*(?:<br\s*\/?>\s*)+<\/p>/gi, "")
      .replace(/<p[^>]*>\s*(?:&nbsp;\s*)+<\/p>/gi, "")
      .replace(/<div\b[^>]*>\s*<\/div>/gi, "");
  }
  return out;
}

/**
 * Uklanja blokove sa istom slikom kao naslovnica (cijeli HTML, više prolaza).
 * Blog i tim: naslovnica je iznad/lijevo; tijelo ne treba duplikat.
 */
export function stripDuplicateTeamCoverFromBody(
  html: string,
  coverUrl: string | null | undefined,
): string {
  if (!html || !coverUrl?.trim()) return html;

  let rest = html;
  let iter = 0;
  while (iter++ < 30) {
    const before = rest;

    rest = rest.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (block) =>
      blockIsDuplicateCoverOnly(block, coverUrl) ? "" : block,
    );

    rest = rest.replace(
      /<div[^>]*\bwp-block-image\b[^>]*>[\s\S]*?<\/div>/gi,
      (block) => (blockIsDuplicateCoverOnly(block, coverUrl) ? "" : block),
    );

    rest = rest.replace(
      /<div[^>]*\bwp-caption\b[^>]*>[\s\S]*?<\/div>/gi,
      (block) => (blockIsDuplicateCoverOnly(block, coverUrl) ? "" : block),
    );

    rest = rest.replace(
      /<div[^>]*>\s*<figure\b[^>]*>[\s\S]*?<\/figure>\s*<\/div>/gi,
      (block) => (blockIsDuplicateCoverOnly(block, coverUrl) ? "" : block),
    );

    rest = rest.replace(
      /<div\b[^>]*>\s*<img[^>]*>\s*<\/div>/gi,
      (block) => (blockIsDuplicateCoverOnly(block, coverUrl) ? "" : block),
    );

    rest = rest.replace(
      /<div\b[^>]*>\s*<img[^>]*\/>\s*<\/div>/gi,
      (block) => (blockIsDuplicateCoverOnly(block, coverUrl) ? "" : block),
    );

    rest = rest.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (full, inner: string) => {
      if (pIsOnlyCoverImg(inner, coverUrl)) return "";
      return full;
    });

    let peel = rest;
    for (let d = 0; d < 12; d++) {
      const next = peel.replace(
        /<div\b[^>]*>((?:(?!<div\b)[\s\S])*)<\/div>/gi,
        (full) => (blockIsDuplicateCoverOnly(full, coverUrl) ? "" : full),
      );
      if (next === peel) break;
      peel = next;
    }
    rest = peel;

    rest = rest.replace(/<img\b[^>]*>/gi, (tag) =>
      imgTagReferencesCover(tag, coverUrl) ? "" : tag,
    );

    rest = scrubEmptyWrappers(rest);

    if (before === rest) break;
  }

  return rest.trim();
}

/** Puna sadržaja unutar jednog taga bez HTML-a — za detekciju „smeća“. */
function innerPlainOneLine(inner: string): string {
  return inner
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(?:x6e|110);/gi, "n")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Uklanja WP uvoz artefakte iz običnog teksta: „n“, „nnn“, „n n nnn“ između rečenica.
 * Ne dira „n“ unutar riječi (npr. „Medicinski“, „Univerzitet“).
 */
export function stripPlainTextNNoise(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  let s = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(?:x6e|110);/gi, "n")
    .replace(/\u00a0/g, " ");

  let prev = "";
  let guard = 0;
  while (prev !== s && guard++ < 24) {
    prev = s;
    const tokens = s.split(/\s+/).filter(Boolean);
    const kept = tokens.filter((tok) => !/^n+$/i.test(tok));
    s = kept.join(" ");
  }

  return s.replace(/\s+/g, " ").trim();
}

/**
 * Tipičan WP/uvoz artefakt: odlomci koji su samo „n“, „nnnn“, „n n n“ itd.
 * Dozvoljava samo „n“ i razmake (uklj. više redova).
 */
function isSpuriousNNoise(plain: string): boolean {
  const t = innerPlainOneLine(plain);
  if (!t) return true;
  return /^n+(\s+n+)*$/i.test(t);
}

/** YouTube / iframe embed — ne smije pasti kroz stripNPlaceholderBlocks (nema plain teksta). */
function blockContainsYoutubeEmbed(inner: string): boolean {
  return (
    /<iframe\b/i.test(inner) ||
    /wp-youtube-embed/i.test(inner) ||
    /data-youtube-url=/i.test(inner) ||
    /youtube\.com\/embed/i.test(inner)
  );
}

/** Da li HTML ima stvarni sadržaj (ne samo WP „nn“ artefakte). */
export function isMeaningfulPublicHtml(html: string | null | undefined): boolean {
  if (html == null || html === "") return false;
  const plain = innerPlainOneLine(html);
  if (!plain) return false;
  return !isSpuriousNNoise(plain);
}

/** Uklanja segmente odvojene <br> koji su samo „nnnn“. */
function stripNoiseSegmentsByBr(inner: string): string {
  const segments = inner.split(/<br\s*\/?>/gi);
  const kept = segments.filter((seg) => !isSpuriousNNoise(seg));
  if (kept.length === 0) return "";
  if (kept.length === segments.length) return inner;
  return kept.join("<br />");
}

/**
 * Uklanja blokove čiji je jedini vidljivi tekst slovo „n“ (i ponavljanja).
 * Ne dira rečenice gdje je „n“ dio normalnog teksta.
 */
export function stripNPlaceholderBlocks(html: string | null | undefined): string {
  if (html == null || html === "") return "";
  let out = html.replace(
    />(?:\s|&nbsp;)*(?:&#(?:x6e|110);(?:\s|&nbsp;)*)+(?=<)/gi,
    ">",
  );

  /* Vodeće „n“ prije prvog HTML taga (npr. n<figure>…) */
  out = out.replace(/^[\s\r\n]*(?:n[\s\r\n]*)+(?=<)/i, "");

  /* Samo tagless n-artefakt (npr. n[shortcode]n → nn poslije uklanjanja shortcode-a) */
  if (isSpuriousNNoise(innerPlainOneLine(out))) return "";

  const stripLooseBetweenTags = (s: string): string =>
    s.replace(
      />(?:\s|&nbsp;|<br\s*\/?>|\n|\r)*(?:n(?:\s|&nbsp;|<br\s*\/?>|\n|\r)*)+(?=<)/gi,
      ">",
    );

  /** n-smeće na kraju dokumenta (poslije zadnjeg taga, bez sljedećeg `<`). */
  const stripTrailingNNoise = (s: string): string =>
    s.replace(
      /(?:\s|&nbsp;|\n|\r|(?:<br\s*\/?>)\s*)*(?:n(?:\s|&nbsp;|\n|\r|<br\s*\/?>)*)+$/gi,
      "",
    );

  let iter = 0;
  while (iter++ < 25) {
    const before = out;

    out = stripLooseBetweenTags(out);
    out = stripTrailingNNoise(out);

    out = out.replace(
      /<p(\b[^>]*)>([\s\S]*?)<\/p>/gi,
      (_full, attrs: string, inner: string) => {
        if (blockContainsYoutubeEmbed(inner)) return `<p${attrs}>${inner}</p>`;
        const byBr = stripNoiseSegmentsByBr(inner);
        if (byBr === "") return "";
        const plain = innerPlainOneLine(byBr);
        if (isSpuriousNNoise(plain)) return "";
        if (byBr === inner) return `<p${attrs}>${inner}</p>`;
        return `<p${attrs}>${byBr}</p>`;
      },
    );

    const loneNBlock = (tag: string) =>
      new RegExp(
        `<${tag}\\b[^>]*>\\s*(?:<br\\s*\\/?>\\s*|&nbsp;\\s*|\\s)*n+(?:\\s*(?:<br\\s*\\/?>|&nbsp;)\\s*)*</${tag}>`,
        "gi",
      );
    for (const tag of [
      "div",
      "span",
      "section",
      "article",
      "aside",
      "blockquote",
      "header",
      "footer",
      "td",
      "th",
      "figure",
      "main",
      "nav",
    ]) {
      out = out.replace(loneNBlock(tag), "");
    }

    out = out.replace(
      /<h([1-6])(\b[^>]*)>([\s\S]*?)<\/h\1>/gi,
      (_full, n: string, attrs: string, inner: string) => {
        const byBr = stripNoiseSegmentsByBr(inner);
        if (byBr === "") return "";
        const plain = innerPlainOneLine(byBr);
        if (isSpuriousNNoise(plain)) return "";
        if (byBr === inner) return `<h${n}${attrs}>${inner}</h${n}>`;
        return `<h${n}${attrs}>${byBr}</h${n}>`;
      },
    );

    out = out.replace(
      /<figcaption(\b[^>]*)>([\s\S]*?)<\/figcaption>/gi,
      (_full, attrs: string, inner: string) => {
        const byBr = stripNoiseSegmentsByBr(inner);
        if (byBr === "") return "";
        const plain = innerPlainOneLine(byBr);
        if (isSpuriousNNoise(plain)) return "";
        if (byBr === inner) return `<figcaption${attrs}>${inner}</figcaption>`;
        return `<figcaption${attrs}>${byBr}</figcaption>`;
      },
    );

    out = out.replace(/<li(\b[^>]*)>([\s\S]*?)<\/li>/gi, (_full, attrs, inner: string) => {
      const byBr = stripNoiseSegmentsByBr(inner);
      if (byBr === "") return "";
      const plain = innerPlainOneLine(byBr);
      if (isSpuriousNNoise(plain)) return "";
      if (byBr === inner) return `<li${attrs}>${inner}</li>`;
      return `<li${attrs}>${byBr}</li>`;
    });

    let peel = out;
    for (let d = 0; d < 14; d++) {
      const next = peel.replace(
        /<div\b[^>]*>((?:(?!<div\b)[\s\S])*)<\/div>/gi,
        (full, inner: string) => {
          if (blockContainsYoutubeEmbed(full) || blockContainsYoutubeEmbed(inner)) {
            return full;
          }
          const byBr = stripNoiseSegmentsByBr(inner);
          if (byBr === "") return "";
          const plain = innerPlainOneLine(byBr);
          if (isSpuriousNNoise(plain)) return "";
          return full;
        },
      );
      if (next === peel) break;
      peel = next;
    }
    out = peel;

    /* Tekst „nnnn“ između zatvaranja i sljedećeg taga (nije u <p>). */
    out = out.replace(
      /(<\/(?:p|div|h[1-6]|li|blockquote|section|article)\b[^>]*>)(?:\s|&nbsp;|\n|\r|(?:<br\s*\/?>)\s*)*(?:n(?:\s|&nbsp;|\n|\r|<br\s*\/?>)*)+(?=<)/gi,
      "$1",
    );

    if (before === out) break;
  }

  out = out
    .replace(/<p[^>]*>\s*<\/p>/gi, "")
    .replace(/<div\b(?![^>]*wp-youtube-embed)(?![^>]*data-youtube-url)[^>]*>\s*<\/div>/gi, "")
    .replace(/<figure\b[^>]*>\s*<\/figure>/gi, "")
    .replace(/<ul\b[^>]*>\s*<\/ul>/gi, "")
    .replace(/<ol\b[^>]*>\s*<\/ol>/gi, "");

  out = stripTrailingNNoise(out);
  if (isSpuriousNNoise(innerPlainOneLine(out))) return "";

  return out.trim();
}

/** Uklanja WP uvoz listu ako prikazujemo dinamički roster sa slikama. */
export function stripTimPregledSection(html: string | null | undefined): string | null {
  if (html == null || html === "") return null;
  const stripped = html
    .replace(/<section[^>]*\btim-pregled\b[^>]*>[\s\S]*?<\/section>/gi, "")
    .trim();
  return stripped.length > 0 ? stripped : null;
}

function buildYoutubeEmbedBlock(embedUrl: string, watchUrl?: string): string {
  if (watchUrl) {
    const fromWatch = buildCmsYoutubeEmbedHtml(watchUrl);
    if (fromWatch) return fromWatch;
  }
  const id = embedUrl.match(/\/embed\/([a-zA-Z0-9_-]{11})/)?.[1];
  const watch = id ? `https://www.youtube.com/watch?v=${id}` : null;
  if (watch) {
    const fromWatch = buildCmsYoutubeEmbedHtml(watch);
    if (fromWatch) return fromWatch;
  }
  return [
    '<div class="wp-youtube-embed">',
    `<iframe src="${embedUrl}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
    "</div>",
  ].join("");
}

const YOUTUBE_URL_NOISE_RE =
  /n*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}n*/gi;

function plainTextFromHtmlFragment(inner: string): string {
  return inner
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&#(?:x6e|110);/gi, "n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Da li je blok praktično samo YouTube link (često sa WP „n“ ispred/iza). */
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

/** Ukloni WP „n“ šum oko YouTube URL-a u tekstu i vrati embed. */
function replaceInlineNoisyYoutubeUrls(text: string): string {
  return text.replace(YOUTUBE_URL_NOISE_RE, (match) => {
    const id = extractYoutubeVideoIdFromNoisyText(match);
    return id ? buildYoutubeEmbedBlock(`https://www.youtube.com/embed/${id}`) : match;
  });
}

/** Zamijeni YouTube linkove u HTML-u ugrađenim pregledom videa. */
export function embedYoutubeLinksInHtml(html: string): string {
  if (!html) return html;

  let out = html.replace(
    /<a\b[^>]*\bhref=(["'])([^"']+)\1[^>]*>[\s\S]*?<\/a>/gi,
    (full, _quote, href: string) => {
      const embed = parseYoutubeEmbedUrl(href) ?? findYoutubeEmbedInNoisyText(href);
      return embed ? buildYoutubeEmbedBlock(embed) : full;
    },
  );

  const blockTags = ["p", "li", "div", "span", "td", "th", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
  for (const tag of blockTags) {
    out = out.replace(
      new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "gi"),
      (full, attrs: string, inner: string) => {
        if (/wp-youtube-embed|youtube\.com\/embed/i.test(inner)) return full;
        const plain = plainTextFromHtmlFragment(inner);
        const embed = findYoutubeEmbedInNoisyText(plain);
        if (!embed) return full;
        if (blockIsOnlyYoutubeLink(plain)) {
          return buildYoutubeEmbedBlock(embed);
        }
        const replaced = replaceInlineNoisyYoutubeUrls(inner);
        return replaced !== inner ? `<${tag}${attrs}>${replaced}</${tag}>` : full;
      },
    );
  }

  out = out.replace(
    /<p\b[^>]*>\s*(<div class="wp-youtube-embed">[\s\S]*?<\/div>)\s*<\/p>/gi,
    "$1",
  );

  out = out.replace(
    /(<p\b[^>]*>)([\s\S]*?)(<\/p>)/gi,
    (full, open, inner, close) => {
      if (/wp-youtube-embed/i.test(inner)) return full;
      if (!YOUTUBE_URL_NOISE_RE.test(inner)) return full;
      YOUTUBE_URL_NOISE_RE.lastIndex = 0;
      const replaced = replaceInlineNoisyYoutubeUrls(inner);
      if (replaced === inner) return full;
      return `${open}${replaced}${close}`;
    },
  );

  return out;
}

/** Sanitizacija + ispravni interni linkovi za javni prikaz. */
export function preparePublicHtml(html: string | null | undefined, locale: Locale): string {
  if (html == null || html === "") return "";
  const sanitized = stripWordPressShortcodesFromContent(
    sanitizePublicCmsHtml(html),
  );
  const unwrapped = normalizeCmsHtmlForEditor(sanitized);
  const linked = prefixRootRelativeAppLinks(unwrapped, locale);
  const cleaned = stripNPlaceholderBlocks(linked);
  const withYoutube = embedYoutubeLinksInHtml(cleaned);
  const withStoredEmbeds = ensureYoutubeEmbedsInCmsHtml(withYoutube);
  const layoutEmbeds = unwrapYoutubeFigureWrappers(withStoredEmbeds);
  return upgradeImageUrlsInHtml(layoutEmbeds);
}

/** Kratki plain/HTML tekst (excerpt, meta) — uklanja WP „n“ smeće. */
export function preparePublicPlainText(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  if (text.includes("<")) {
    return stripPlainTextNNoise(stripNPlaceholderBlocks(sanitizePublicCmsHtml(text)));
  }
  return stripPlainTextNNoise(text);
}
