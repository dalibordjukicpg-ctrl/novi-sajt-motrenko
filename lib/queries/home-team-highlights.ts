import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  homeTeamHighlightTranslations,
  homeTeamHighlights,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, locales } from "@/lib/i18n";
import {
  getSitePageBySlugForAdmin,
  type SitePageAdminDetail,
} from "@/lib/queries/site-pages-admin";
import { slugFromTeamHighlightHref } from "@/lib/team-highlight-href";

export type HomeTeamHighlight = {
  id: string;
  sortOrder: number;
  href: string;
  visible: boolean;
  title: string;
  teaser: string | null;
};

export type HomeTeamHighlightAdmin = {
  id: string;
  sortOrder: number;
  href: string;
  visible: boolean;
  translations: Record<Locale, { title: string; teaser: string | null }>;
};

export async function listVisibleHomeTeamHighlights(
  locale: Locale,
): Promise<HomeTeamHighlight[]> {
  const rows = await db
    .select({
      id: homeTeamHighlights.id,
      sortOrder: homeTeamHighlights.sortOrder,
      href: homeTeamHighlights.href,
      visible: homeTeamHighlights.visible,
      locale: homeTeamHighlightTranslations.locale,
      title: homeTeamHighlightTranslations.title,
      teaser: homeTeamHighlightTranslations.teaser,
    })
    .from(homeTeamHighlights)
    .leftJoin(
      homeTeamHighlightTranslations,
      eq(homeTeamHighlightTranslations.highlightId, homeTeamHighlights.id),
    )
    .where(eq(homeTeamHighlights.visible, true))
    .orderBy(asc(homeTeamHighlights.sortOrder));

  const byId = new Map<
    string,
    {
      base: Omit<HomeTeamHighlight, "title" | "teaser">;
      trans: Map<string, { title: string; teaser: string | null }>;
    }
  >();
  for (const r of rows) {
    if (!byId.has(r.id)) {
      byId.set(r.id, {
        base: {
          id: r.id,
          sortOrder: r.sortOrder,
          href: r.href,
          visible: r.visible,
        },
        trans: new Map(),
      });
    }
    if (r.locale) {
      byId.get(r.id)!.trans.set(r.locale, {
        title: r.title ?? "",
        teaser: r.teaser ?? null,
      });
    }
  }

  return Array.from(byId.values()).map(({ base, trans }) => {
    const t =
      trans.get(locale) ??
      trans.get(defaultLocale) ?? { title: "", teaser: null };
    return { ...base, title: t.title, teaser: t.teaser };
  });
}

export async function listHomeTeamHighlightsAdmin(): Promise<HomeTeamHighlightAdmin[]> {
  const rows = await db
    .select({
      id: homeTeamHighlights.id,
      sortOrder: homeTeamHighlights.sortOrder,
      href: homeTeamHighlights.href,
      visible: homeTeamHighlights.visible,
      locale: homeTeamHighlightTranslations.locale,
      title: homeTeamHighlightTranslations.title,
      teaser: homeTeamHighlightTranslations.teaser,
    })
    .from(homeTeamHighlights)
    .leftJoin(
      homeTeamHighlightTranslations,
      eq(homeTeamHighlightTranslations.highlightId, homeTeamHighlights.id),
    )
    .orderBy(asc(homeTeamHighlights.sortOrder));

  const byId = new Map<string, HomeTeamHighlightAdmin>();
  for (const r of rows) {
    if (!byId.has(r.id)) {
      const emptyTrans = Object.fromEntries(
        locales.map((l) => [l, { title: "", teaser: null }]),
      ) as Record<Locale, { title: string; teaser: string | null }>;
      byId.set(r.id, {
        id: r.id,
        sortOrder: r.sortOrder,
        href: r.href,
        visible: r.visible,
        translations: emptyTrans,
      });
    }
    if (r.locale) {
      const loc = r.locale as Locale;
      byId.get(r.id)!.translations[loc] = {
        title: r.title ?? "",
        teaser: r.teaser ?? null,
      };
    }
  }

  return Array.from(byId.values());
}

/** CMS stranice povezane s karticama (po slug-u iz href). */
export async function resolveLinkedPagesForTeamHighlights(
  highlights: HomeTeamHighlightAdmin[],
): Promise<Record<string, SitePageAdminDetail | null>> {
  const out: Record<string, SitePageAdminDetail | null> = {};
  for (const h of highlights) {
    const slug = slugFromTeamHighlightHref(h.href);
    out[h.id] = slug ? await getSitePageBySlugForAdmin(slug) : null;
  }
  return out;
}

export async function upsertHighlightTranslation(
  highlightId: string,
  locale: Locale,
  title: string,
  teaser: string | null,
): Promise<void> {
  const { randomUUID } = await import("crypto");
  const [existing] = await db
    .select({ id: homeTeamHighlightTranslations.id })
    .from(homeTeamHighlightTranslations)
    .where(
      and(
        eq(homeTeamHighlightTranslations.highlightId, highlightId),
        eq(homeTeamHighlightTranslations.locale, locale),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(homeTeamHighlightTranslations)
      .set({ title: title.slice(0, 500), teaser: teaser || null })
      .where(eq(homeTeamHighlightTranslations.id, existing.id));
  } else {
    await db.insert(homeTeamHighlightTranslations).values({
      id: randomUUID(),
      highlightId,
      locale,
      title: title.slice(0, 500),
      teaser: teaser || null,
    });
  }
}
