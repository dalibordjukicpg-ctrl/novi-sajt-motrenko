import { cache } from "react";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  navLinkTranslations,
  navLinks,
  siteLocaleStrings,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { getSiteBranding } from "@/lib/queries/site-globals";
import { SITE_STRING_DEFAULTS, SITE_STRING_KEYS } from "@/lib/site-fields";
import type { SiteStringKey } from "@/lib/site-fields";

export type PublicNavItem = {
  id: string;
  href: string;
  label: string;
  children: PublicNavItem[];
};

/** Vraća mapu ključ → vrijednost za jedan jezik. */
export async function getSiteStringsMap(
  locale: Locale,
): Promise<Partial<Record<SiteStringKey, string>>> {
  const rows = await db
    .select({
      fieldKey: siteLocaleStrings.fieldKey,
      value: siteLocaleStrings.value,
    })
    .from(siteLocaleStrings)
    .where(eq(siteLocaleStrings.locale, locale));

  const map: Partial<Record<SiteStringKey, string>> = {};
  for (const r of rows) {
    map[r.fieldKey as SiteStringKey] = r.value;
  }
  return map;
}

function labelForLocale(
  translations: { locale: string; label: string }[],
  locale: Locale,
): string {
  const row = translations.find((t) => t.locale === locale);
  return row?.label ?? translations[0]?.label ?? "";
}

/** MariaDB / stariji MySQL: bez Drizzle relational `with` (LATERAL + json_arrayagg). */
async function navLinksWithTranslations(visibleOnly: boolean): Promise<
  {
    link: typeof navLinks.$inferSelect;
    translations: { locale: string; label: string }[];
  }[]
> {
  const linkRows = visibleOnly
    ? await db
        .select()
        .from(navLinks)
        .where(eq(navLinks.visible, true))
        .orderBy(asc(navLinks.sortOrder), asc(navLinks.id))
    : await db
        .select()
        .from(navLinks)
        .orderBy(asc(navLinks.sortOrder), asc(navLinks.id));

  if (linkRows.length === 0) return [];

  const ids = linkRows.map((l) => l.id);
  const transRows = await db
    .select({
      navLinkId: navLinkTranslations.navLinkId,
      locale: navLinkTranslations.locale,
      label: navLinkTranslations.label,
    })
    .from(navLinkTranslations)
    .where(inArray(navLinkTranslations.navLinkId, ids));

  const byLink = new Map<string, { locale: string; label: string }[]>();
  for (const t of transRows) {
    const list = byLink.get(t.navLinkId) ?? [];
    list.push({ locale: t.locale, label: t.label });
    byLink.set(t.navLinkId, list);
  }

  return linkRows.map((link) => ({
    link,
    translations: byLink.get(link.id) ?? [],
  }));
}

/** Drvo navigacije za header (samo vidljive stavke). */
export async function getNavTree(locale: Locale): Promise<PublicNavItem[]> {
  const rows = await navLinksWithTranslations(true);

  const byId = new Map<string, PublicNavItem>();
  for (const { link: r, translations } of rows) {
    byId.set(r.id, {
      id: r.id,
      href: r.href,
      label: labelForLocale(translations, locale),
      children: [],
    });
  }

  const roots: PublicNavItem[] = [];
  for (const { link: r } of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.children.push(node);
    } else if (!r.parentId) {
      roots.push(node);
    }
  }
  return roots;
}

export type AdminNavRow = {
  linkId: string;
  parentId: string | null;
  sortOrder: number;
  href: string;
  visible: boolean;
  labels: Record<Locale, string>;
};

export async function loadNavForAdmin(): Promise<AdminNavRow[]> {
  const rows = await navLinksWithTranslations(false);
  return rows.map(({ link: r, translations }) => {
    const labels: Record<Locale, string> = { me: "", en: "", ru: "", tr: "" };
    for (const t of translations) {
      if (t.locale in labels) labels[t.locale as Locale] = t.label;
    }
    return {
      linkId: r.id,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
      href: r.href,
      visible: r.visible,
      labels,
    };
  });
}

export function pickString(
  map: Partial<Record<SiteStringKey, string>>,
  key: SiteStringKey,
  fallback: string,
): string {
  const v = map[key];
  return v != null && v.length > 0 ? v : fallback;
}

/** Spaja bazu sa podrazumijevanim tekstovima (kad ključ fali). */
export function mergeSiteStrings(
  locale: Locale,
  fromDb: Partial<Record<SiteStringKey, string>>,
): Record<SiteStringKey, string> {
  const base = { ...SITE_STRING_DEFAULTS[locale] };
  for (const k of SITE_STRING_KEYS) {
    const v = fromDb[k];
    if (v != null && v.length > 0) base[k] = v;
  }
  return base;
}

export function resolvePublicHref(locale: Locale, href: string): string {
  const t = href.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("#")) return `/${locale}${t}`;
  return t;
}

/** Jedan upit po requestu za layout + početnu (React cache). Nikad ne baca — izbjegava otrov cache-a i prazne stranice ako baza / migracije fale. */
export const getSiteLayoutData = cache(async (locale: Locale) => {
  let map: Partial<Record<SiteStringKey, string>> = {};
  try {
    map = await getSiteStringsMap(locale);
  } catch (e) {
    console.error("[getSiteStringsMap]", e);
  }
  let nav: PublicNavItem[] = [];
  try {
    nav = await getNavTree(locale);
  } catch (e) {
    console.error("[getNavTree]", e);
  }

  let heroBgUrl: string | null = null;
  let logoUrl: string | null = null;
  try {
    const b = await getSiteBranding();
    heroBgUrl = b.heroBgUrl;
    logoUrl = b.logoUrl;
  } catch (e) {
    console.error("[getSiteLayoutData branding]", e);
  }

  return { s: mergeSiteStrings(locale, map), nav, heroBgUrl, logoUrl };
});
