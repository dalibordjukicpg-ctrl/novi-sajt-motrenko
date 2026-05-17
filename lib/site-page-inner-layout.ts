import type { Locale } from "@/lib/i18n";
import type { PublicNavItem } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import { looksLikeONamaNavRoot } from "@/lib/site-page-header-nav";

export type InnerPageSidebarItem = {
  href: string;
  label: string;
  slug: string | null;
};

export type SitePageInnerNavContext = {
  sectionLabel: string;
  sectionHref: string;
  items: InnerPageSidebarItem[];
};

function pagePathForSlug(locale: Locale, slug: string): string {
  return `/${locale}/s/${slug}`.toLowerCase();
}

function resolvedPath(locale: Locale, href: string): string {
  return resolvePublicHref(locale, href).toLowerCase();
}

function hrefMatchesSiteSlug(locale: Locale, href: string, slug: string): boolean {
  const target = pagePathForSlug(locale, slug);
  if (resolvedPath(locale, href) === target) return true;
  const t = href.trim();
  const hashIdx = t.indexOf("#");
  if (hashIdx < 0) return false;
  let frag = t.slice(hashIdx + 1).split("?")[0]!.trim().toLowerCase();
  frag = frag.replace(/^\/+/, "");
  const s = slug.trim().toLowerCase();
  if (!frag || !s) return false;
  return frag === s || frag.endsWith(`/${s}`) || frag === `s/${s}`;
}

function slugFromPublicHref(href: string): string | null {
  const m = href.match(/\/s\/([^/?#"'\s]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return m[1]!.toLowerCase();
  }
}

function treeContainsSlug(
  locale: Locale,
  node: PublicNavItem,
  slug: string,
): boolean {
  if (hrefMatchesSiteSlug(locale, node.href, slug)) return true;
  for (const c of node.children) {
    if (treeContainsSlug(locale, c, slug)) return true;
  }
  return false;
}

/**
 * Za CMS stranice pod „O nama“: naslov sekcije, link na stub, i stavke bočnog menija (kao na mockupu).
 */
export function getONamaInnerPageContext(
  locale: Locale,
  slug: string,
  nav: PublicNavItem[],
): SitePageInnerNavContext | null {
  const onama = nav.find((r) => looksLikeONamaNavRoot(r));
  if (!onama?.children.length) return null;

  if (!treeContainsSlug(locale, onama, slug)) return null;

  const items: InnerPageSidebarItem[] = [];
  const seen = new Set<string>();
  for (const c of onama.children) {
    const href = resolvePublicHref(locale, c.href);
    if (!seen.has(href)) {
      seen.add(href);
      items.push({
        href,
        label: c.label,
        slug: slugFromPublicHref(href),
      });
    }
    for (const gc of c.children) {
      const gh = resolvePublicHref(locale, gc.href);
      if (!seen.has(gh)) {
        seen.add(gh);
        items.push({
          href: gh,
          label: gc.label,
          slug: slugFromPublicHref(gh),
        });
      }
    }
  }

  return {
    sectionLabel: onama.label,
    sectionHref: resolvePublicHref(locale, onama.href),
    items,
  };
}
