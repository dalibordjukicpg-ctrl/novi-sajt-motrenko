/**
 * Ubaci YouTube klipove iz WP baze na odgovarajuća mjesta.
 * npx tsx --env-file=.env scripts/add-histeroskopija-youtube.ts
 */
import { and, eq } from "drizzle-orm";

import {
  buildCmsYoutubeEmbedHtml,
  ensureYoutubeEmbedsInCmsHtml,
  normalizeCmsHtmlForEditor,
} from "../lib/cms-youtube-html";
import { extractYoutubeVideoIdFromNoisyText } from "../lib/youtube-hero";
import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";
import { defaultLocale } from "../lib/i18n";

/** WP post 2080 — redoslijed u sekciji Histeroskopija */
const VIDEO_POLIPI = "https://www.youtube.com/watch?v=OsM6G-ZUQ7g";
const VIDEO_SEPTUM = "https://www.youtube.com/watch?v=-jnrnBe2d_o";

function bodyHasVideoId(body: string, watchUrl: string): boolean {
  const id = extractYoutubeVideoIdFromNoisyText(watchUrl);
  if (!id) return false;
  return body.includes(id);
}

/** Ubaci HTML odmah poslije N-tog </p> (0 = prvi paragraf). */
function insertAfterParagraph(
  html: string,
  paraIndex: number,
  insertHtml: string,
): string {
  let i = 0;
  let inserted = false;
  const out = html.replace(/<\/p>/gi, (match) => {
    if (i === paraIndex && !inserted) {
      inserted = true;
      i++;
      return `${match}${insertHtml}`;
    }
    i++;
    return match;
  });
  return inserted ? out : html;
}

function fixGinekHisteroskopijaSection(body: string): string {
  return ensureYoutubeEmbedsInCmsHtml(normalizeCmsHtmlForEditor(body));
}

function addVideosToHisteroskopijaPage(body: string): string {
  if (bodyHasVideoId(body, VIDEO_POLIPI) && bodyHasVideoId(body, VIDEO_SEPTUM)) {
    return ensureYoutubeEmbedsInCmsHtml(body);
  }

  const block1 = buildCmsYoutubeEmbedHtml(VIDEO_POLIPI);
  const block2 = buildCmsYoutubeEmbedHtml(VIDEO_SEPTUM);
  if (!block1 || !block2) return body;

  let next = body;
  // Od kraja — indeksi paragrafa se ne pomjeraju
  if (!bodyHasVideoId(next, VIDEO_SEPTUM)) {
    next = insertAfterParagraph(next, 2, block2);
  }
  if (!bodyHasVideoId(next, VIDEO_POLIPI)) {
    next = insertAfterParagraph(next, 0, block1);
  }
  return ensureYoutubeEmbedsInCmsHtml(normalizeCmsHtmlForEditor(next));
}

async function updatePage(
  slug: string,
  transform: (body: string, locale: string) => string,
  locales?: string[],
) {
  const [page] = await db
    .select({ id: sitePages.id })
    .from(sitePages)
    .where(eq(sitePages.slug, slug))
    .limit(1);

  if (!page) {
    console.warn(`Stranica "${slug}" nije pronađena.`);
    return 0;
  }

  const rows = await db
    .select({
      id: sitePageTranslations.id,
      locale: sitePageTranslations.locale,
      body: sitePageTranslations.body,
    })
    .from(sitePageTranslations)
    .where(eq(sitePageTranslations.pageId, page.id));

  let updated = 0;
  for (const row of rows) {
    if (locales && !locales.includes(row.locale)) continue;
    const body = row.body ?? "";
    if (!body.trim()) continue;
    const next = transform(body, row.locale);
    if (next === body) continue;
    await db
      .update(sitePageTranslations)
      .set({ body: next })
      .where(eq(sitePageTranslations.id, row.id));
    console.log(`  ažurirano: ${slug} [${row.locale}]`);
    updated++;
  }
  return updated;
}

async function main() {
  let total = 0;

  console.log("Ginekološke intervencije — popravka WP embedova u sekciji Histeroskopija…");
  total += await updatePage(
    "ginekoloske-intervencije-i-operacije",
    (body) => fixGinekHisteroskopijaSection(body),
    [defaultLocale, "tr"],
  );

  console.log("Histeroskopija — ubacivanje videa (Polipi, Septum)…");
  total += await updatePage("histeroskopija", (body, locale) => {
    if (locale !== defaultLocale) {
      // EN/RU: samo popravi embed ako već postoji
      return ensureYoutubeEmbedsInCmsHtml(normalizeCmsHtmlForEditor(body));
    }
    return addVideosToHisteroskopijaPage(body);
  });

  console.log(
    total > 0
      ? `Gotovo — ${total} prijevod(a) ažurirano.`
      : "Nema promjena (video već prisutan ili prazan sadržaj).",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
