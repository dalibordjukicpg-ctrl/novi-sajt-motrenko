import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sitePageTranslations, sitePages } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { preparePublicHtml } from "@/lib/public-cms-html";

export type PublicSitePage = {
  slug: string;
  title: string;
  body: string | null;
};

export async function getPublishedSitePage(
  locale: Locale,
  slug: string,
): Promise<PublicSitePage | null> {
  const rows = await db
    .select({
      slug: sitePages.slug,
      title: sitePageTranslations.title,
      body: sitePageTranslations.body,
    })
    .from(sitePages)
    .innerJoin(
      sitePageTranslations,
      eq(sitePageTranslations.pageId, sitePages.id),
    )
    .where(
      and(
        eq(sitePages.slug, slug),
        eq(sitePages.published, true),
        eq(sitePageTranslations.locale, locale),
      ),
    )
    .limit(1);

  const [row] = rows;
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    body: row.body ? preparePublicHtml(row.body, locale) : null,
  };
}
