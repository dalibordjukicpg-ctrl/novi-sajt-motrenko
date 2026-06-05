/**
 * Forsiraj YouTube embedove na IVF stranici (ICSI + Šta možemo).
 * npx tsx --env-file=.env scripts/force-fix-ivf-youtube.ts
 * npx tsx --env-file=.env scripts/force-fix-ivf-youtube.ts --second=https://www.youtube.com/watch?v=XXXX
 */
import { eq } from "drizzle-orm";

import {
  buildCmsYoutubeEmbedHtml,
  ensureYoutubeEmbedsInCmsHtml,
} from "../lib/cms-youtube-html";
import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";

const IVF_SLUG = "ivf";
const ICSI_URL = "https://www.youtube.com/watch?v=Iu5mktOlaok";

const YOUTUBE_URL_NOISE_RE =
  /n*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}n*/gi;

const FIGURE_YOUTUBE_RE =
  /<figure\b[^>]*\bis-provider-youtube\b[^>]*>[\s\S]*?<\/figure>/gi;

const INVALID_EMBED_RE =
  /<div\b[^>]*(?:wp-youtube-embed|data-youtube-invalid|data-youtube-url)[^>]*>[\s\S]*?<\/div>/gi;

const ERROR_PARAGRAPH_RE = /<p\b[^>]*>\s*Neispravan YouTube link\s*<\/p>/gi;

function secondUrlFromArgv(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--second="));
  if (!arg) return null;
  return arg.slice("--second=".length).trim() || null;
}

function stripYoutubeArtifacts(body: string): string {
  let out = body;
  out = out.replace(YOUTUBE_URL_NOISE_RE, "");
  out = out.replace(FIGURE_YOUTUBE_RE, "");
  out = out.replace(INVALID_EMBED_RE, "");
  out = out.replace(ERROR_PARAGRAPH_RE, "");
  return out;
}

function forceIvfYoutubeEmbeds(body: string, secondUrl: string | null): string {
  let out = stripYoutubeArtifacts(body);

  const icsiBlock = buildCmsYoutubeEmbedHtml(ICSI_URL);
  out = out.replace(
    /<h2\b[^>]*>[\s\S]*?ICSI[\s\S]*?<\/h2>/i,
    (heading) => `${heading}${icsiBlock}`,
  );

  if (secondUrl) {
    const secondBlock = buildCmsYoutubeEmbedHtml(secondUrl);
    if (secondBlock) {
      const mozemoRe =
        /<h2\b[^>]*>[\s\S]*?(?:možemo|mozemo|očekujemo|ocekujemo|expect)[\s\S]*?<\/h2>/i;
      const m = mozemoRe.exec(out);
      if (m) {
        const insertAt = m.index + m[0].length;
        out = `${out.slice(0, insertAt)}${secondBlock}${out.slice(insertAt)}`;
      }
    }
  }

  out = out.replace(/\n{3,}/g, "\n\n");
  return ensureYoutubeEmbedsInCmsHtml(out);
}

async function main() {
  const secondUrl = secondUrlFromArgv();
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
    const next = forceIvfYoutubeEmbeds(before, secondUrl);
    await db
      .update(sitePageTranslations)
      .set({ body: next })
      .where(eq(sitePageTranslations.id, row.id));
    const embedCount = (next.match(/wp-youtube-embed/gi) ?? []).length;
    console.log(
      `${row.locale}: ${before.length} → ${next.length} bajtova, embedova=${embedCount}`,
    );
  }

  console.log(`ICSI: ${ICSI_URL}`);
  if (secondUrl) {
    console.log(`Drugi: ${secondUrl}`);
  } else {
    console.log(
      "Drugi video nije postavljen — pokreni sa --second=https://www.youtube.com/watch?v=...",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
