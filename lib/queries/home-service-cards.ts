import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { homeServiceCards, homeServiceCardTranslations } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, locales } from "@/lib/i18n";

export type HomeServiceCard = {
  id: string;
  sortOrder: number;
  iconName: string;
  href: string;
  visible: boolean;
  title: string;
  description: string | null;
};

export type HomeServiceCardAdmin = {
  id: string;
  sortOrder: number;
  iconName: string;
  href: string;
  visible: boolean;
  translations: Record<Locale, { title: string; description: string | null }>;
};

/** Objavljene kartice za javni prikaz (vidljive, po sort_order). */
export async function listVisibleHomeServiceCards(
  locale: Locale,
): Promise<HomeServiceCard[]> {
  const rows = await db
    .select({
      id: homeServiceCards.id,
      sortOrder: homeServiceCards.sortOrder,
      iconName: homeServiceCards.iconName,
      href: homeServiceCards.href,
      visible: homeServiceCards.visible,
      locale: homeServiceCardTranslations.locale,
      title: homeServiceCardTranslations.title,
      description: homeServiceCardTranslations.description,
    })
    .from(homeServiceCards)
    .leftJoin(
      homeServiceCardTranslations,
      eq(homeServiceCardTranslations.cardId, homeServiceCards.id),
    )
    .where(eq(homeServiceCards.visible, true))
    .orderBy(asc(homeServiceCards.sortOrder));

  const byId = new Map<
    string,
    { base: Omit<HomeServiceCard, "title" | "description">; trans: Map<string, { title: string; description: string | null }> }
  >();
  for (const r of rows) {
    if (!byId.has(r.id)) {
      byId.set(r.id, {
        base: { id: r.id, sortOrder: r.sortOrder, iconName: r.iconName, href: r.href, visible: r.visible },
        trans: new Map(),
      });
    }
    if (r.locale) {
      byId.get(r.id)!.trans.set(r.locale, { title: r.title ?? "", description: r.description ?? null });
    }
  }

  return Array.from(byId.values()).map(({ base, trans }) => {
    const t = trans.get(locale) ?? trans.get(defaultLocale) ?? { title: "", description: null };
    return { ...base, title: t.title, description: t.description };
  });
}

/** Sve kartice za admin (uključujući nevidljive), sa svim prevodima. */
export async function listHomeServiceCardsAdmin(): Promise<HomeServiceCardAdmin[]> {
  const rows = await db
    .select({
      id: homeServiceCards.id,
      sortOrder: homeServiceCards.sortOrder,
      iconName: homeServiceCards.iconName,
      href: homeServiceCards.href,
      visible: homeServiceCards.visible,
      locale: homeServiceCardTranslations.locale,
      title: homeServiceCardTranslations.title,
      description: homeServiceCardTranslations.description,
    })
    .from(homeServiceCards)
    .leftJoin(
      homeServiceCardTranslations,
      eq(homeServiceCardTranslations.cardId, homeServiceCards.id),
    )
    .orderBy(asc(homeServiceCards.sortOrder));

  const byId = new Map<string, HomeServiceCardAdmin>();
  for (const r of rows) {
    if (!byId.has(r.id)) {
      const emptyTrans = Object.fromEntries(
        locales.map((l) => [l, { title: "", description: null }]),
      ) as Record<Locale, { title: string; description: string | null }>;
      byId.set(r.id, {
        id: r.id,
        sortOrder: r.sortOrder,
        iconName: r.iconName,
        href: r.href,
        visible: r.visible,
        translations: emptyTrans,
      });
    }
    if (r.locale) {
      const loc = r.locale as Locale;
      byId.get(r.id)!.translations[loc] = {
        title: r.title ?? "",
        description: r.description ?? null,
      };
    }
  }

  return Array.from(byId.values());
}

/** Upsert prijevoda za karticu (insert ili update). */
export async function upsertCardTranslation(
  cardId: string,
  locale: Locale,
  title: string,
  description: string | null,
): Promise<void> {
  const { randomUUID } = await import("crypto");
  const [existing] = await db
    .select({ id: homeServiceCardTranslations.id })
    .from(homeServiceCardTranslations)
    .where(
      and(
        eq(homeServiceCardTranslations.cardId, cardId),
        eq(homeServiceCardTranslations.locale, locale),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(homeServiceCardTranslations)
      .set({ title: title.slice(0, 500), description: description || null })
      .where(eq(homeServiceCardTranslations.id, existing.id));
  } else {
    await db.insert(homeServiceCardTranslations).values({
      id: randomUUID(),
      cardId,
      locale,
      title: title.slice(0, 500),
      description: description || null,
    });
  }
}
