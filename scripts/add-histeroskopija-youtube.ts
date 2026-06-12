/**
 * Ubaci YouTube klipove iz WP baze na odgovarajuća mjesta (svi jezici).
 * npx tsx --env-file=.env scripts/add-histeroskopija-youtube.ts
 */
import { eq } from "drizzle-orm";

import {
  buildCmsYoutubeEmbedHtml,
  ensureYoutubeEmbedsInCmsHtml,
  normalizeCmsHtmlForEditor,
} from "../lib/cms-youtube-html";
import { extractYoutubeVideoIdFromNoisyText } from "../lib/youtube-hero";
import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";

/** WP post 2080 — redoslijed u sekciji Histeroskopija */
const VIDEO_POLIPI = "https://www.youtube.com/watch?v=OsM6G-ZUQ7g";
const VIDEO_SEPTUM = "https://www.youtube.com/watch?v=-jnrnBe2d_o";

const HISTEROSKOPIJA_H2_RE =
  /(<h2\b[^>]*>[\s\S]*?(?:histeroskop|hysteroscop|гистероскоп)[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2\b|$)/i;

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

function finalizeYoutubeBody(body: string): string {
  return ensureYoutubeEmbedsInCmsHtml(normalizeCmsHtmlForEditor(body));
}

/** Ginek stranica: ubaci video u sekciju Histeroskopija / Hysteroscopy / Гистероскопия. */
function addVideosToGinekHisteroskopijaSection(body: string): string {
  if (bodyHasVideoId(body, VIDEO_POLIPI) && bodyHasVideoId(body, VIDEO_SEPTUM)) {
    return finalizeYoutubeBody(body);
  }

  const block1 = buildCmsYoutubeEmbedHtml(VIDEO_POLIPI);
  const block2 = buildCmsYoutubeEmbedHtml(VIDEO_SEPTUM);
  if (!block1 || !block2) return finalizeYoutubeBody(body);

  const match = HISTEROSKOPIJA_H2_RE.exec(body);
  if (!match) return finalizeYoutubeBody(body);

  const [full, h2, sectionBody] = match;
  let inner = sectionBody;
  if (!bodyHasVideoId(inner, VIDEO_POLIPI)) {
    inner = insertAfterParagraph(inner, 0, block1);
  }
  if (!bodyHasVideoId(inner, VIDEO_SEPTUM)) {
    inner = insertAfterParagraph(inner, 2, block2);
  }

  if (inner === sectionBody) return finalizeYoutubeBody(body);
  return finalizeYoutubeBody(body.replace(full, `${h2}${inner}`));
}

/** Stranica /s/histeroskopija — video poslije 1. i 3. paragrafa. */
function addVideosToHisteroskopijaPage(body: string): string {
  if (bodyHasVideoId(body, VIDEO_POLIPI) && bodyHasVideoId(body, VIDEO_SEPTUM)) {
    return finalizeYoutubeBody(body);
  }

  const block1 = buildCmsYoutubeEmbedHtml(VIDEO_POLIPI);
  const block2 = buildCmsYoutubeEmbedHtml(VIDEO_SEPTUM);
  if (!block1 || !block2) return finalizeYoutubeBody(body);

  let next = body;
  if (!bodyHasVideoId(next, VIDEO_SEPTUM)) {
    next = insertAfterParagraph(next, 2, block2);
  }
  if (!bodyHasVideoId(next, VIDEO_POLIPI)) {
    next = insertAfterParagraph(next, 0, block1);
  }
  return finalizeYoutubeBody(next);
}

async function updatePage(
  slug: string,
  transform: (body: string) => string,
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
    const body = row.body ?? "";
    if (!body.trim()) continue;
    const next = transform(body);
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

  console.log("Ginekološke intervencije — sekcija Histeroskopija (svi jezici)…");
  total += await updatePage(
    "ginekoloske-intervencije-i-operacije",
    addVideosToGinekHisteroskopijaSection,
  );

  console.log("Histeroskopija — ubacivanje videa (svi jezici)…");
  total += await updatePage("histeroskopija", addVideosToHisteroskopijaPage);

  console.log(
    total > 0
      ? `Gotovo — ${total} prijevod(a) ažurirano. Pokreni: npm run deploy`
      : "Nema promjena (video već prisutan).",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
