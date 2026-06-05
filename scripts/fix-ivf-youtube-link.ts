/**
 * Zamijeni oštećeni YouTube link na stranici ivf čistim embedom.
 * Pokretanje: npx tsx --env-file=.env scripts/fix-ivf-youtube-link.ts
 */
import { and, eq } from "drizzle-orm";

import {
  ensureYoutubeEmbedsInCmsHtml,
  normalizeCmsHtmlForEditor,
  replaceYoutubeLinkInHtml,
} from "../lib/cms-youtube-html";
import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";
import { defaultLocale } from "../lib/i18n";

const IVF_SLUG = "ivf";
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=Iu5mktOlaok";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL nije postavljen.");
    process.exit(1);
  }

  const [page] = await db
    .select({ id: sitePages.id, slug: sitePages.slug })
    .from(sitePages)
    .where(eq(sitePages.slug, IVF_SLUG))
    .limit(1);

  if (!page) {
    console.error(`Stranica "${IVF_SLUG}" nije pronađena.`);
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

  let updated = 0;
  for (const row of rows) {
    const body = row.body ?? "";
    if (!body.trim()) continue;
    const replaced = replaceYoutubeLinkInHtml(body, YOUTUBE_WATCH_URL);
    const next = ensureYoutubeEmbedsInCmsHtml(normalizeCmsHtmlForEditor(replaced));
    if (next === body) continue;
    await db
      .update(sitePageTranslations)
      .set({ body: next })
      .where(eq(sitePageTranslations.id, row.id));
    updated += 1;
    console.log(`Ažurirano: ${row.locale}`);
  }

  if (updated === 0) {
    const [me] = rows.filter((r) => r.locale === defaultLocale);
    if (me?.body) {
      console.log("Nema promjene — provjerite ručno sadržaj.");
    } else {
      const next = replaceYoutubeLinkInHtml("", YOUTUBE_WATCH_URL);
      const meRow = rows.find((r) => r.locale === defaultLocale);
      if (meRow) {
        await db
          .update(sitePageTranslations)
          .set({ body: next })
          .where(eq(sitePageTranslations.id, meRow.id));
        console.log("Dodat YouTube embed u prazan ME sadržaj.");
        updated = 1;
      }
    }
  }

  console.log(
    updated > 0
      ? `Gotovo. Ažurirano ${updated} prijevod(a) za /s/${IVF_SLUG}.`
      : `Nema izmjena u bazi za /s/${IVF_SLUG}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
