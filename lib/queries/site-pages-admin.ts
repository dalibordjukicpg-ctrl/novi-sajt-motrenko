import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sitePageTranslations, sitePages } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

export type SitePageListItem = {
  id: string;
  slug: string;
  published: boolean;
  /** Naslov na „me” za listu / select */
  titleMe: string;
};

export async function listSitePagesForAdmin(): Promise<SitePageListItem[]> {
  const rows = await db
    .select({
      id: sitePages.id,
      slug: sitePages.slug,
      published: sitePages.published,
      title: sitePageTranslations.title,
    })
    .from(sitePages)
    .innerJoin(
      sitePageTranslations,
      and(
        eq(sitePageTranslations.pageId, sitePages.id),
        eq(sitePageTranslations.locale, "me"),
      ),
    )
    .orderBy(asc(sitePages.slug));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    published: r.published,
    titleMe: r.title,
  }));
}

export type SitePageAdminDetail = {
  id: string;
  slug: string;
  published: boolean;
  /** Ključ grupe u headeru pod „Uslugama“; null = nije podgrupa. */
  headerNavGroup: string | null;
  byLocale: Record<
    Locale,
    { title: string; body: string }
  >;
};

export async function getSitePageForAdmin(
  pageId: string,
): Promise<SitePageAdminDetail | null> {
  const pageRows = await db
    .select()
    .from(sitePages)
    .where(eq(sitePages.id, pageId))
    .limit(1);
  const [page] = pageRows;
  if (!page) return null;

  const trans = await db
    .select()
    .from(sitePageTranslations)
    .where(eq(sitePageTranslations.pageId, pageId));

  return {
    id: page.id,
    slug: page.slug,
    published: page.published,
    headerNavGroup: page.headerNavGroup ?? null,
    byLocale: fillByLocale(trans),
  };
}

function fillByLocale(
  trans: { locale: string; title: string; body: string | null }[],
): SitePageAdminDetail["byLocale"] {
  const byLocale = {} as SitePageAdminDetail["byLocale"];
  for (const loc of locales) {
    const row = trans.find((t) => t.locale === loc);
    byLocale[loc] = {
      title: row?.title ?? "",
      body: row?.body ?? "",
    };
  }
  return byLocale;
}
