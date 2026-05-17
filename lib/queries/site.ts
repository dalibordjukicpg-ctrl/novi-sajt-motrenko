import { cache } from "react";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  navLinkTranslations,
  navLinks,
  siteLocaleStrings,
  sitePageTranslations,
  sitePages,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { getSiteBranding, getTeamHomePortraitUrls } from "@/lib/queries/site-globals";
import { SITE_STRING_DEFAULTS, SITE_STRING_KEYS } from "@/lib/site-fields";
import type { SiteStringKey } from "@/lib/site-fields";
import {
  attachCmsPagesUnderUsluge,
  consolidateServiceRootsUnderUsluge,
  looksLikeUslugeParent,
  matchNavNodeToUslugeGroupKey,
  nestUslugeLeavesIntoCategoryColumns,
  sortUslugeCategoryPillars,
  type CmsNavPageEntry,
} from "@/lib/site-page-header-nav";
import {
  buildFooterStructuredColumns,
  buildGinekologijaHeaderLinkRows,
  buildIuiIvfHeaderLinkRows,
  buildPrezervacijaHeaderLinkRows,
  buildTrudnocaHeaderLinkRows,
  resolveFooterContactPageHref,
  type FooterColumnData,
} from "@/lib/footer-structured-nav";

export type PublicNavItem = {
  id: string;
  href: string;
  label: string;
  children: PublicNavItem[];
};

/** Ista normalizacija kao za sprečavanje duplikata — path bez lokala/hash, lower case. */
function normHrefForNavDedup(href: string): string {
  let h = href.trim().toLowerCase();
  h = h.replace(/^https?:\/\/[^/]+/i, "");
  h = h.replace(/^\/(?:me|en|ru|tr)(?=\/)/i, "");
  const hash = h.indexOf("#");
  if (hash >= 0) h = h.slice(0, hash);
  h = h.replace(/\/+$/, "");
  return h || "/";
}

function collectNavHrefs(nodes: PublicNavItem[]): Set<string> {
  const s = new Set<string>();
  function walk(n: PublicNavItem) {
    s.add(normHrefForNavDedup(n.href));
    for (const c of n.children) walk(c);
  }
  for (const n of nodes) walk(n);
  return s;
}

/** CMS stranice za header: objavljene, bez naslovne; grupa za ugniježđavanje pod „Uslugama“. */
async function loadCmsNavPageEntries(locale: Locale): Promise<CmsNavPageEntry[]> {
  const rows = await db
    .select({
      slug: sitePages.slug,
      title: sitePageTranslations.title,
      headerNavGroup: sitePages.headerNavGroup,
    })
    .from(sitePages)
    .innerJoin(
      sitePageTranslations,
      and(
        eq(sitePageTranslations.pageId, sitePages.id),
        eq(sitePageTranslations.locale, locale),
      ),
    )
    .where(eq(sitePages.published, true))
    .orderBy(asc(sitePageTranslations.title));

  const out: CmsNavPageEntry[] = [];
  for (const r of rows) {
    const slug = (r.slug ?? "").trim();
    if (!slug || slug === "naslovna") continue;
    const href = `/s/${slug}`;
    const label = (r.title ?? "").trim() || slug;
    const g = (r.headerNavGroup ?? "").trim();
    out.push({
      item: {
        id: `cms-page:${slug}`,
        href,
        label,
        children: [],
      },
      groupKey: g,
    });
  }
  return out;
}

/** Slug → `header_nav_group` za objavljene stranice (raspored stavki u mega meniju). */
async function loadPublishedSlugToHeaderGroup(): Promise<Map<string, string>> {
  const rows = await db
    .select({
      slug: sitePages.slug,
      headerNavGroup: sitePages.headerNavGroup,
    })
    .from(sitePages)
    .where(eq(sitePages.published, true));

  const m = new Map<string, string>();
  for (const r of rows) {
    const s = (r.slug ?? "").trim();
    const g = (r.headerNavGroup ?? "").trim();
    if (!s || !g) continue;
    m.set(s, g);
  }
  return m;
}

async function loadPublishedPagesForFooter(
  locale: Locale,
): Promise<{ slug: string; title: string }[]> {
  const rows = await db
    .select({
      slug: sitePages.slug,
      title: sitePageTranslations.title,
    })
    .from(sitePages)
    .innerJoin(
      sitePageTranslations,
      and(
        eq(sitePageTranslations.pageId, sitePages.id),
        eq(sitePageTranslations.locale, locale),
      ),
    )
    .where(eq(sitePages.published, true));

  const out: { slug: string; title: string }[] = [];
  for (const r of rows) {
    const slug = (r.slug ?? "").trim();
    if (!slug || slug === "naslovna") continue;
    out.push({ slug, title: (r.title ?? "").trim() });
  }
  return out;
}

export type { FooterColumnData } from "@/lib/footer-structured-nav";

/** Footer: grupisani linkovi po koloni (1–4 u bazi). */
export type PublicFooterColumn = {
  column: number;
  links: { href: string; label: string }[];
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

/** Popuni / zamijeni djecu stub „IUI i IVF“ u mega meniju — 9 canonical stavki kao na referentnoj slici. */
function applyCanonicalIuiIvfColumnChildren(
  roots: PublicNavItem[],
  locale: Locale,
  pages: { slug: string; title: string }[],
): void {
  const usluge = roots.find((r) => looksLikeUslugeParent(r));
  if (!usluge) return;

  const rows = buildIuiIvfHeaderLinkRows(locale, pages);
  const leaves: PublicNavItem[] = rows.map((r, i) => ({
    id: `canonical-iui-ivf-${i}`,
    href: r.href,
    label: r.label,
    children: [],
  }));

  const idx = usluge.children.findIndex(
    (c) => matchNavNodeToUslugeGroupKey(c) === "iui_ivf",
  );

  if (idx >= 0) {
    const pillar = usluge.children[idx]!;
    pillar.children = leaves;
    return;
  }

  usluge.children.push({
    id: "nav-synthetic-iui-ivf-pillar",
    href: "#usluge-iui_ivf",
    label: "IUI i IVF",
    children: leaves,
  });
}

/** Popuni / zamijeni djecu stub „Ginekologija“ — kanonske stavke kao u footer koloni. */
function applyCanonicalGinekologijaColumnChildren(
  roots: PublicNavItem[],
  locale: Locale,
  pages: { slug: string; title: string }[],
): void {
  const usluge = roots.find((r) => looksLikeUslugeParent(r));
  if (!usluge) return;

  const rows = buildGinekologijaHeaderLinkRows(locale, pages);
  const leaves: PublicNavItem[] = rows.map((r, i) => ({
    id: `canonical-ginekologija-${i}`,
    href: r.href,
    label: r.label,
    children: [],
  }));

  const idx = usluge.children.findIndex(
    (c) => matchNavNodeToUslugeGroupKey(c) === "ginekologija",
  );

  if (idx >= 0) {
    const pillar = usluge.children[idx]!;
    pillar.children = leaves;
    return;
  }

  usluge.children.push({
    id: "nav-synthetic-ginekologija-pillar",
    href: "#usluge-ginekologija",
    label: "Ginekologija",
    children: leaves,
  });
}

/** Popuni / zamijeni djecu stub „Trudnoća“ — 4 canonical stavke kao na referentnoj slici. */
function applyCanonicalTrudnocaColumnChildren(
  roots: PublicNavItem[],
  locale: Locale,
  pages: { slug: string; title: string }[],
): void {
  const usluge = roots.find((r) => looksLikeUslugeParent(r));
  if (!usluge) return;

  const rows = buildTrudnocaHeaderLinkRows(locale, pages);
  const leaves: PublicNavItem[] = rows.map((r, i) => ({
    id: `canonical-trudnoca-${i}`,
    href: r.href,
    label: r.label,
    children: [],
  }));

  const idx = usluge.children.findIndex(
    (c) => matchNavNodeToUslugeGroupKey(c) === "trudnoca",
  );

  if (idx >= 0) {
    const pillar = usluge.children[idx]!;
    pillar.children = leaves;
    return;
  }

  usluge.children.push({
    id: "nav-synthetic-trudnoca-pillar",
    href: "#usluge-trudnoca",
    label: "Trudnoća",
    children: leaves,
  });
}

/** Naslov stuba „prezervacija“ u mega meniju (krioprezervacija → posebna kolona ispod ginekologije). */
const PREZERVACIJA_MEGA_PILLAR_LABEL =
  "Krioprezervacija embriona – Zamrzavanje embriona (vitrifikacija embriona)";

/** Popuni / zamijeni djecu stub „Prezervacija fertilnosti“ — 3 canonical stavke kao na referentnoj slici. */
function applyCanonicalPrezervacijaColumnChildren(
  roots: PublicNavItem[],
  locale: Locale,
  pages: { slug: string; title: string }[],
): void {
  const usluge = roots.find((r) => looksLikeUslugeParent(r));
  if (!usluge) return;

  const rows = buildPrezervacijaHeaderLinkRows(locale, pages);
  const leaves: PublicNavItem[] = rows.map((r, i) => ({
    id: `canonical-prezervacija-${i}`,
    href: r.href,
    label: r.label,
    children: [],
  }));

  const idx = usluge.children.findIndex(
    (c) => matchNavNodeToUslugeGroupKey(c) === "prezervacija",
  );

  if (idx >= 0) {
    const pillar = usluge.children[idx]!;
    pillar.label = PREZERVACIJA_MEGA_PILLAR_LABEL;
    pillar.children = leaves;
    return;
  }

  usluge.children.push({
    id: "nav-synthetic-prezervacija-pillar",
    href: "#usluge-prezervacija",
    label: PREZERVACIJA_MEGA_PILLAR_LABEL,
    children: leaves,
  });
}

function labelForLocale(
  translations: { locale: string; label: string }[],
  locale: Locale,
): string {
  const row = translations.find((t) => t.locale === locale);
  return row?.label ?? translations[0]?.label ?? "";
}

/** MariaDB / stariji MySQL: bez Drizzle relational `with` (LATERAL + json_arrayagg). */
async function navLinksWithTranslations(
  visibleOnly: boolean,
  placement: "header" | "footer" | "all",
): Promise<
  {
    link: typeof navLinks.$inferSelect;
    translations: { locale: string; label: string }[];
  }[]
> {
  const vis = visibleOnly ? eq(navLinks.visible, true) : undefined;
  const place =
    placement === "all" ? undefined : eq(navLinks.placement, placement);
  const whereClause = and(vis, place);

  const linkRows = whereClause
    ? await db
        .select()
        .from(navLinks)
        .where(whereClause)
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

/** Drvo za header: korijeni su samo placement=header; djeca mogu biti header ili footer (isti parentId u bazi). */
export async function getNavTree(locale: Locale): Promise<PublicNavItem[]> {
  const rows = await navLinksWithTranslations(true, "all");

  const byId = new Map<string, PublicNavItem>();
  const sortOrderById = new Map<string, number>();
  for (const { link: r, translations } of rows) {
    sortOrderById.set(r.id, r.sortOrder);
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
    } else if (
      r.placement === "header" &&
      (!r.parentId || !byId.has(r.parentId))
    ) {
      roots.push(node);
    }
  }

  function normNavLabelForSort(label: string): string {
    return label
      .replace(/\u00a0/g, " ")
      .trim()
      .toLowerCase();
  }

  const bySort = (a: PublicNavItem, b: PublicNavItem) => {
    const da = sortOrderById.get(a.id) ?? 0;
    const db = sortOrderById.get(b.id) ?? 0;
    if (da !== db) return da - db;
    return normNavLabelForSort(a.label).localeCompare(
      normNavLabelForSort(b.label),
      "sr",
    );
  };

  function sortDeep(nodes: PublicNavItem[]) {
    nodes.sort(bySort);
    for (const n of nodes) sortDeep(n.children);
  }
  sortDeep(roots);

  const navRoots = consolidateServiceRootsUnderUsluge(roots);

  try {
    const used = collectNavHrefs(navRoots);
    const cmsEntries = await loadCmsNavPageEntries(locale);
    const slugToGroup = await loadPublishedSlugToHeaderGroup();
    if (navRoots.some((r) => looksLikeUslugeParent(r))) {
      attachCmsPagesUnderUsluge(
        navRoots,
        cmsEntries,
        used,
        normHrefForNavDedup,
      );
      nestUslugeLeavesIntoCategoryColumns(navRoots, slugToGroup);
    }
    const pagesForIuiIvf = await loadPublishedPagesForFooter(locale);
    applyCanonicalIuiIvfColumnChildren(navRoots, locale, pagesForIuiIvf);
    applyCanonicalGinekologijaColumnChildren(navRoots, locale, pagesForIuiIvf);
    applyCanonicalTrudnocaColumnChildren(navRoots, locale, pagesForIuiIvf);
    applyCanonicalPrezervacijaColumnChildren(navRoots, locale, pagesForIuiIvf);
    sortUslugeCategoryPillars(navRoots);
    for (const { item } of cmsEntries) {
      if (used.has(normHrefForNavDedup(item.href))) continue;
      navRoots.push({ ...item, children: [] });
      used.add(normHrefForNavDedup(item.href));
    }
  } catch (e) {
    console.error("[getNavTree] CMS stranice za header", e);
  }

  return navRoots;
}

/** Footer linkovi po kolonama (placement=footer). Redovi sa footer_column=0 prikazuju se u koloni 1. */
export async function getFooterNavColumns(
  locale: Locale,
): Promise<PublicFooterColumn[]> {
  const place = eq(navLinks.placement, "footer");
  const vis = eq(navLinks.visible, true);
  const linkRows = await db
    .select()
    .from(navLinks)
    .where(and(place, vis))
    .orderBy(
      asc(navLinks.footerColumn),
      asc(navLinks.sortOrder),
      asc(navLinks.id),
    );

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

  const byCol = new Map<number, { href: string; label: string }[]>();
  for (const link of linkRows) {
    let c = link.footerColumn;
    if (!Number.isFinite(c) || c < 1) c = 1;
    if (c > 4) continue;
    const translations = byLink.get(link.id) ?? [];
    const list = byCol.get(c) ?? [];
    list.push({
      href: link.href,
      label: labelForLocale(translations, locale),
    });
    byCol.set(c, list);
  }

  return [...byCol.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([column, links]) => ({ column, links }));
}

export type AdminNavRow = {
  linkId: string;
  parentId: string | null;
  sortOrder: number;
  href: string;
  visible: boolean;
  placement: "header" | "footer";
  footerColumn: number;
  labels: Record<Locale, string>;
};

export async function loadNavForAdmin(): Promise<AdminNavRow[]> {
  const rows = await navLinksWithTranslations(false, "all");
  return rows.map(({ link: r, translations }) => {
    const labels = Object.fromEntries(
      locales.map((l) => [l, ""]),
    ) as Record<Locale, string>;
    for (const t of translations) {
      if (t.locale in labels) labels[t.locale as Locale] = t.label;
    }
    return {
      linkId: r.id,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
      href: r.href,
      visible: r.visible,
      placement: r.placement,
      footerColumn: r.footerColumn,
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

/** Stari default u bazi: utorak 06:30–20:00; sada usklađeno sa pon–pet. */
function shouldReplaceLegacyTuesdayHours(tuesday: string, monFri: string): boolean {
  const t = tuesday.replace(/\D/g, "");
  if (t !== "06302000") return false;
  const mf = monFri.replace(/\D/g, "");
  /* Ako je i ponedjeljak–petak isti stari interval, ne petljaj se. */
  return mf.length > 0 && mf !== "06302000";
}

const STAT_VALUE_KEYS = [
  "stat1.value",
  "stat2.value",
  "stat3.value",
  "stat4.value",
] as const satisfies readonly SiteStringKey[];

/** Vrijednosti iz CMS-a koje ne treba prikazivati umjesto pravih statistika. */
function isPlaceholderStatValue(v: string): boolean {
  const t = v.trim();
  return t === "0" || t === "0%" || t === "0+" || t === "00%" || t === "00+";
}

/** Spaja bazu sa podrazumijevanim tekstovima (kad ključ fali). */
export function mergeSiteStrings(
  locale: Locale,
  fromDb: Partial<Record<SiteStringKey, string>>,
): Record<SiteStringKey, string> {
  const base = { ...SITE_STRING_DEFAULTS[locale] };
  const defs = SITE_STRING_DEFAULTS[locale];
  for (const k of SITE_STRING_KEYS) {
    const v = fromDb[k];
    if (v != null && v.trim().length > 0) base[k] = v.trim();
  }
  for (const k of STAT_VALUE_KEYS) {
    if (isPlaceholderStatValue(base[k])) base[k] = defs[k];
  }
  if (
    shouldReplaceLegacyTuesdayHours(base["hours.tuesday"], base["hours.mon_fri"])
  ) {
    base["hours.tuesday"] = base["hours.mon_fri"];
  }
  return base;
}

export { resolvePublicHref } from "@/lib/resolve-public-href";

/** Jedan upit po requestu za layout + početnu (React cache). Nikad ne baca — izbjegava otrov cache-a i prazne stranice ako baza / migracije fale. */
export const getSiteLayoutData = cache(async (locale: Locale) => {
  let map: Partial<Record<SiteStringKey, string>> = {};
  try {
    map = await getSiteStringsMap(locale);
  } catch (e) {
    console.error("[getSiteStringsMap]", e);
  }

  const s = mergeSiteStrings(locale, map);

  let nav: PublicNavItem[] = [];
  try {
    nav = await getNavTree(locale);
  } catch (e) {
    console.error("[getNavTree]", e);
  }

  let footerNav: PublicFooterColumn[] = [];
  try {
    footerNav = await getFooterNavColumns(locale);
  } catch (e) {
    console.error("[getFooterNavColumns]", e);
  }

  let footerStructured: FooterColumnData[] = [];
  let footerContactHref: string | null = null;
  try {
    const pages = await loadPublishedPagesForFooter(locale);
    footerStructured = buildFooterStructuredColumns(s, pages, locale);
    footerContactHref = resolveFooterContactPageHref(locale, pages);
  } catch (e) {
    console.error("[footer structured nav]", e);
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

  let teamHomePortraitUrls: string[] = [];
  try {
    teamHomePortraitUrls = await getTeamHomePortraitUrls();
  } catch (e) {
    console.error("[getSiteLayoutData team portraits]", e);
  }

  return {
    s,
    nav,
    footerNav,
    footerStructured,
    footerContactHref,
    heroBgUrl,
    logoUrl,
    teamHomePortraitUrls,
  };
});
