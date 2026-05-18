import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";
import type { MachineTranslateTarget } from "@/lib/machine-translate";
import type { PublicNavItem } from "@/lib/queries/site";
import {
  isMachineTranslateTarget,
  isNavRuntimeTranslateEnabled,
  translateNavPlainForLocale,
} from "@/lib/runtime-translate";
import {
  applyPublicHeaderNavPolicy,
  consolidateServiceRootsUnderUsluge,
  looksLikeBlogNavRoot,
  looksLikeONamaNavRoot,
  looksLikeUslugeParent,
  sortPublicHeaderRoots,
} from "@/lib/site-page-header-nav";

function shallowCloneNavChildren(nodes: PublicNavItem[]): PublicNavItem[] {
  return nodes.map((c) => ({ ...c, children: [] }));
}

/**
 * Kad baza nije dostupna ili `nav_links` još nisu posejani — ista struktura kao u seed-u (Usluge + podstavke).
 */
export const FALLBACK_HEADER_NAV: PublicNavItem[] = [
  {
    id: "fallback-onama",
    href: "#o-nama",
    label: "O nama",
    children: [
      {
        id: "fallback-onama-prica",
        href: "#o-nama",
        label: "Naša priča",
        children: [],
      },
      {
        id: "fallback-onama-tim",
        href: "#tim",
        label: "Naš tim",
        children: [],
      },
    ],
  },
  {
    id: "fallback-usluge",
    href: "#usluge",
    label: "Usluge",
    children: [
      {
        id: "fallback-usluge-inf",
        href: "#usluge-inf",
        label: "Infertilitet i sterilitet",
        children: [],
      },
      {
        id: "fallback-usluge-iui",
        href: "#usluge-iui",
        label: "IUI i IVF",
        children: [],
      },
      {
        id: "fallback-usluge-gine",
        href: "#usluge-gine",
        label: "Ginekologija",
        children: [],
      },
      {
        id: "fallback-usluge-trud",
        href: "#usluge-trud",
        label: "Trudnoća",
        children: [],
      },
      {
        id: "fallback-usluge-prez",
        href: "#usluge-prez",
        label: "Prezervacija fertilnosti",
        children: [],
      },
    ],
  },
  {
    id: "fallback-blog",
    href: "#novosti",
    label: "Blog",
    children: [],
  },
  {
    id: "fallback-kontakt",
    href: "#kontakt",
    label: "Kontakt",
    children: [],
  },
];

function normNavLabel(label: string): string {
  return label.replace(/\u00a0/g, " ").trim().toLowerCase();
}

function cloneUslugeChildren(from: PublicNavItem): PublicNavItem[] {
  return from.children.map((c) => ({ ...c, children: [] }));
}

/**
 * Kad iz baze stigne „Usluge“ bez ijednog djeteta u drvetu (često: djeca su u bazi ali
 * `visible: false` ili nisu `placement: header`), dopuni iste dvije stavke kao u seed-u.
 *
 * Ne diramo postojeću djecu iz baze (npr. mnogo usluga iz WP uvoza) — samo prazan roditelj.
 */
export function mergeNavWithFallbackSubmenus(nav: PublicNavItem[]): PublicNavItem[] {
  if (nav.length === 0) return FALLBACK_HEADER_NAV;
  const fbUsluge = FALLBACK_HEADER_NAV.find((x) => normNavLabel(x.label) === "usluge");
  if (!fbUsluge?.children.length) return nav;

  return nav.map((item) => {
    if (!looksLikeUslugeParent(item)) return item;
    if (item.children.length === 0) {
      return { ...item, children: cloneUslugeChildren(fbUsluge) };
    }
    return item;
  });
}

function ensureFallbackONama(roots: PublicNavItem[]): PublicNavItem[] {
  const fb = FALLBACK_HEADER_NAV.find((x) => looksLikeONamaNavRoot(x));
  if (!fb) return roots;

  const sub = shallowCloneNavChildren(fb.children);
  const hasOnama = roots.some((r) => looksLikeONamaNavRoot(r));
  if (!hasOnama) {
    return [{ ...fb, children: sub }, ...roots];
  }

  return roots.map((r) => {
    if (!looksLikeONamaNavRoot(r)) return r;
    if (r.children.length > 0) return r;
    if (!sub.length) return r;
    return { ...r, children: sub };
  });
}

function ensureFallbackBlog(roots: PublicNavItem[]): PublicNavItem[] {
  if (roots.some((r) => looksLikeBlogNavRoot(r))) return roots;
  const fb = FALLBACK_HEADER_NAV.find((x) => looksLikeBlogNavRoot(x));
  if (!fb) return roots;
  return [...roots, { ...fb, children: [] }];
}

/**
 * Spoji podmenije iz seed-a, uskladi sa javnom politikom (O nama, Usluge, Blog, Kontakt).
 * Desktop: jedan mega meni „Usluge“. Mobilni spljoštava kategorije samo u `SiteHeader`.
 *
 * Async je zbog finalnog prolaza prevoda fallback labela (id koji počinje sa „fallback-“):
 * one se hardkodiraju u ME, pa ih u RU/EN moramo dodatno provući kroz mašinski prevod
 * kako se srpski tekstovi ne bi „provukli“ u prevedeni header (npr. „O nama“, „Naša priča“,
 * „Naš tim“, „Blog“). DB-nodes su već lokalizovani u `getNavTree`.
 */
export async function resolveHeaderNav(
  nav: PublicNavItem[],
  locale: Locale = defaultLocale,
): Promise<PublicNavItem[]> {
  let out = consolidateServiceRootsUnderUsluge(mergeNavWithFallbackSubmenus(nav));
  out = applyPublicHeaderNavPolicy(out);
  out = mergeNavWithFallbackSubmenus(out);
  out = ensureFallbackONama(out);
  out = ensureFallbackBlog(out);
  sortPublicHeaderRoots(out);
  await localizeFallbackLabelsInPlace(out, locale);
  return out;
}

/**
 * Prevedi sve „fallback-“ čvorove (one koji nisu došli iz baze) preko mašinskog prevoda.
 * DB čvorovi su već lokalizovani u `getNavTree`, pa njih ne diramo.
 */
async function localizeFallbackLabelsInPlace(
  roots: PublicNavItem[],
  locale: Locale,
): Promise<void> {
  if (!isMachineTranslateTarget(locale) || !isNavRuntimeTranslateEnabled()) {
    return;
  }
  const target = locale as MachineTranslateTarget;

  const pending: { node: PublicNavItem; me: string }[] = [];
  function visit(node: PublicNavItem): void {
    if (node.id.startsWith("fallback-")) {
      const me = node.label.trim();
      if (me.length > 0) pending.push({ node, me });
    }
    for (const c of node.children) visit(c);
  }
  for (const r of roots) visit(r);
  if (pending.length === 0) return;

  const uniq = Array.from(new Set(pending.map((p) => p.me)));
  const cache = new Map<string, string>();
  await Promise.all(
    uniq.map(async (src) => {
      const t = await translateNavPlainForLocale(src, target);
      if (t && t.trim().length > 0) cache.set(src, t);
    }),
  );
  for (const p of pending) {
    const t = cache.get(p.me);
    if (t) p.node.label = t;
  }
}
