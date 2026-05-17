import type { PublicNavItem } from "@/lib/queries/site";
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
 */
export function resolveHeaderNav(nav: PublicNavItem[]): PublicNavItem[] {
  let out = consolidateServiceRootsUnderUsluge(mergeNavWithFallbackSubmenus(nav));
  out = applyPublicHeaderNavPolicy(out);
  out = mergeNavWithFallbackSubmenus(out);
  out = ensureFallbackONama(out);
  out = ensureFallbackBlog(out);
  sortPublicHeaderRoots(out);
  return out;
}
