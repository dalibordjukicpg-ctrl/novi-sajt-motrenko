import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sitePageTranslations, sitePages } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";
import { normalizeQuestionnaireEmbedUrl } from "@/lib/questionnaire-embed";
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
  unlisted: boolean;
  questionnaireEmbedUrl: string | null;
  /** Stranica je imala WP shortcode za osoblje — prikaži React roster. */
  showTeamRoster?: boolean;
};

type SitePageRow = {
  slug: string;
  title: string;
  body: string | null;
  unlisted: boolean;
  questionnaireEmbedUrl: string | null;
};

async function fetchSitePageRow(
  locale: Locale,
  slug: string,
): Promise<SitePageRow | null> {
  const [row] = await db
    .select({
      slug: sitePages.slug,
      title: sitePageTranslations.title,
      body: sitePageTranslations.body,
      unlisted: sitePages.unlisted,
      questionnaireEmbedUrl: sitePages.questionnaireEmbedUrl,
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

  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    unlisted: row.unlisted,
    questionnaireEmbedUrl: normalizeQuestionnaireEmbedUrl(row.questionnaireEmbedUrl),
  };
}

function toPublicSitePage(
  row: SitePageRow,
  locale: Locale,
  bodyRaw: string | null,
  title: string,
): PublicSitePage {
  return {
    slug: row.slug,
    title,
    body: bodyRaw ? preparePublicHtml(bodyRaw, locale) : null,
    unlisted: row.unlisted,
    questionnaireEmbedUrl: row.questionnaireEmbedUrl,
    showTeamRoster:
      row.slug === "tim" || containsStaffPostGridShortcode(bodyRaw),
  };
}

/** Objavljene, javno indeksirane CMS stranice (bez skrivenih / upitnika). */
export async function listPublishedSitePageSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: sitePages.slug })
    .from(sitePages)
    .where(and(eq(sitePages.published, true), eq(sitePages.unlisted, false)));
  return rows.map((r) => r.slug);
}

export async function getPublishedSitePage(
  locale: Locale,
  slug: string,
): Promise<PublicSitePage | null> {
  const meRow = await fetchSitePageRow(defaultLocale, slug);
  if (!meRow) return null;

  if (locale === defaultLocale) {
    return toPublicSitePage(meRow, locale, meRow.body, meRow.title);
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

  return toPublicSitePage(meRow, locale, bodyRaw, title);
}