/**
 * Forsiraj tačan YouTube link na IVF stranici — ukloni figure/wp omotače i stari youtu.be tekst.
 * npx tsx --env-file=.env scripts/force-fix-ivf-youtube.ts
 */
import { eq } from "drizzle-orm";

import {
  buildCmsYoutubeEmbedHtml,
  ensureYoutubeEmbedsInCmsHtml,
} from "../lib/cms-youtube-html";
import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";

const IVF_SLUG = "ivf";
const WATCH_URL = "https://www.youtube.com/watch?v=Iu5mktOlaok";
const EMBED_BLOCK = buildCmsYoutubeEmbedHtml(WATCH_URL);

const YOUTUBE_URL_NOISE_RE =
  /n*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}n*/gi;

const FIGURE_YOUTUBE_RE =
  /<figure\b[^>]*\bis-provider-youtube\b[^>]*>[\s\S]*?<\/figure>/gi;

function forceIcsiYoutubeEmbed(body: string): string {
  let out = body;

  out = out.replace(YOUTUBE_URL_NOISE_RE, "");
  out = out.replace(FIGURE_YOUTUBE_RE, "");
  out = out.replace(
    /<div\b[^>]*class=["'][^"']*wp-youtube-embed[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    "",
  );

  const icsiHeadingRe =
    /<h2\b[^>]*>[\s\S]*?ICSI[\s\S]*?<\/h2>/i;
  const m = icsiHeadingRe.exec(out);
  if (m) {
    const insertAt = m.index + m[0].length;
    out = `${out.slice(0, insertAt)}${EMBED_BLOCK}${out.slice(insertAt)}`;
  } else {
    out = `${EMBED_BLOCK}\n${out}`;
  }

  out = out.replace(/\n{3,}/g, "\n\n");
  return ensureYoutubeEmbedsInCmsHtml(out);
}

async function main() {
  const [page] = await db
    .select({ id: sitePages.id })
    .from(sitePages)
    .where(eq(sitePages.slug, IVF_SLUG))
    .limit(1);
  if (!page) {
    console.error("Stranica ivf nije pronađena.");
    process.exit(1);
  }

  const rows = await db
    .select({
      id: sitePageTranslations.id,
      locale: sitePageTranslations.locale,
      body: sitePageTranslations.body,
    })
    .from(sitePageTranslations)
    .where(eq(sitePageTranslations.pageId, page.id));

  for (const row of rows) {
    const before = row.body ?? "";
    const next = forceIcsiYoutubeEmbed(before);
    await db
      .update(sitePageTranslations)
      .set({ body: next })
      .where(eq(sitePageTranslations.id, row.id));
    console.log(
      `${row.locale}: ${before.length} → ${next.length} bajtova, embed=${next.includes(WATCH_URL)}`,
    );
  }

  console.log(`Gotovo. Link: ${WATCH_URL}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
