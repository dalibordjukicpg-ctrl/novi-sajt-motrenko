import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sitePageTranslations, sitePages } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";
import { preparePublicHtml } from "@/lib/public-cms-html";
import { containsStaffPostGridShortcode } from "@/lib/wordpress-shortcodes";
import {
  isMachineTranslateTarget,
  isRuntimeTranslateEnabled,
  needsRuntimeTranslation,
  translateHtmlForLocale,
  translatePlainForLocale,
} from "@/lib/runtime-translate";

export type PublicSitePage = {
  slug: string;
  title: string;
  body: string | null;
  /** Stranica je imala WP shortcode za osoblje — prikaži React roster. */
  showTeamRoster?: boolean;
};

async function fetchSitePageRow(
  locale: Locale,
  slug: string,
): Promise<{ slug: string; title: string; body: string | null } | null> {
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
    body: row.body,
  };
}

/** Svi slugovi objavljenih CMS stranica (za sitemap). */
export async function listPublishedSitePageSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: sitePages.slug })
    .from(sitePages)
    .where(eq(sitePages.published, true));
  return rows.map((r) => r.slug);
}

export async function getPublishedSitePage(
  locale: Locale,
  slug: string,
): Promise<PublicSitePage | null> {
  const meRow = await fetchSitePageRow(defaultLocale, slug);
  if (!meRow) return null;

  if (locale === defaultLocale) {
    const rawBody = meRow.body;
    return {
      slug: meRow.slug,
      title: meRow.title,
      body: rawBody ? preparePublicHtml(rawBody, locale) : null,
      showTeamRoster:
        meRow.slug === "tim" || containsStaffPostGridShortcode(rawBody),
    };
  }

  const locRow = await fetchSitePageRow(locale, slug);

  let title = locRow?.title?.trim() ? locRow.title : meRow.title;
  let bodyRaw = locRow?.body?.trim() ? locRow.body : meRow.body;

  if (isRuntimeTranslateEnabled() && isMachineTranslateTarget(locale)) {
    if (needsRuntimeTranslation(title, meRow.title)) {
      title = await translatePlainForLocale(meRow.title, locale);
    }
    if (bodyRaw && needsRuntimeTranslation(bodyRaw, meRow.body)) {
      bodyRaw = await translateHtmlForLocale(meRow.body ?? "", locale);
    }
  }

  return {
    slug: meRow.slug,
    title,
    body: bodyRaw ? preparePublicHtml(bodyRaw, locale) : null,
    showTeamRoster:
      meRow.slug === "tim" || containsStaffPostGridShortcode(meRow.body),
  };
}
