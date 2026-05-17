import type { Locale } from "@/lib/i18n";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import type { SiteStringKey } from "@/lib/site-fields";

export type FooterPageRow = { slug: string; title: string };

export type FooterColumnData = {
  title: string;
  links: { label: string; href: string | null }[];
};

type LinkDef = { label: string; slugHints: string[] };

function normMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function findPageForHints(
  pages: FooterPageRow[],
  hints: string[],
): FooterPageRow | null {
  for (const raw of hints) {
    const c = normMatch(raw);
    if (!c) continue;
    for (const p of pages) {
      const ns = normMatch(p.slug);
      if (ns === c || ns.includes(c) || c.includes(ns)) return p;
    }
  }
  for (const raw of hints) {
    const c = normMatch(raw);
    if (c.length < 4) continue;
    for (const p of pages) {
      const nt = normMatch(p.title);
      if (nt.includes(c)) return p;
    }
  }
  return null;
}

function resolveLabels(
  locale: Locale,
  defs: LinkDef[],
  pages: FooterPageRow[],
): { label: string; href: string | null }[] {
  return defs.map((d) => {
    const hit = findPageForHints(pages, [d.label, ...d.slugHints]);
    if (!hit)
      return {
        label: d.label,
        href: null,
      };
    return {
      label: d.label,
      href: resolvePublicHref(locale, `/s/${hit.slug}`),
    };
  });
}

/** Redoslijed i tekst linkova — slugHints pomažu kad se slug razlikuje od naslova (WP import). */
const COL_INFERTILITY: LinkDef[] = [
  { label: "Fertilnost ljudske rase", slugHints: ["fertilnost", "ljudske-rase"] },
  { label: "Kada se javiti", slugHints: ["kada-se-javiti", "javiti"] },
  { label: "Uzroci infertiliteta", slugHints: ["uzroci", "infertiliteta"] },
  {
    label: "Dijagnostičke metode – muškarac",
    slugHints: ["dijagnosticke-metode-muskarac", "muskarac", "muski"],
  },
  {
    label: "Dijagnostičke metode – žena",
    slugHints: ["dijagnosticke-metode-zena", "zene", "zena"],
  },
  { label: "Psihološka podrška", slugHints: ["psiholoska", "podrska", "psiholo"] },
];

const COL_IUI_IVF: LinkDef[] = [
  { label: "Stimulacija ovulacije", slugHints: ["stimulacija", "ovulacije"] },
  { label: "IUI", slugHints: ["iui"] },
  {
    label: "IVF (In-Vitro Fertilizacija)",
    slugHints: [
      "ivf",
      "in-vitro",
      "in vitro",
      "fertilizacija",
      "vantjelesna",
      "oplodnja",
    ],
  },
  {
    label: "Kultivacija embriona – gajenje embriona",
    slugHints: ["kultivacija", "embriona", "gajenje-embriona", "gajenje"],
  },
  { label: "Donacija oocita", slugHints: ["donacija-oocita", "oocita"] },
  { label: "Donacija sperme", slugHints: ["donacija-sperme", "sperme"] },
  { label: "Donacija embriona", slugHints: ["donacija-embriona"] },
  { label: "Dodatne tehnike", slugHints: ["dodatne-tehnike", "tehnike"] },
];

/** Tipične stavke reference menija „Ginekologija“ (slugHints za CMS / WP). */
const COL_GINEKOLOGIJA: LinkDef[] = [
  {
    label: "Redovni ginekološki pregled",
    slugHints: ["ginekoloski-pregled", "redovni-pregled", "ginekologija-pregled"],
  },
  {
    label: "Ultrazvuk",
    slugHints: ["ultrazvuk", "uzv", "ultrasound"],
  },
  {
    label: "Kolposkopija i PAPA test",
    slugHints: ["kolposkopija", "papa", "papanicolau", "citoloski"],
  },
  {
    label: "Menstrualni i hormonski poremećaji",
    slugHints: [
      "menstrualni",
      "hormonski",
      "poremecaji",
      "menstruacija",
      "policisticni",
    ],
  },
];

/** Ista tri linka kao na referentnom mega meniju „Prezervacija fertilnosti“. */
const COL_PRESERVACIJA: LinkDef[] = [
  {
    label: "Prezervacija fertilnosti – muškarci",
    slugHints: ["prezervacija", "muskarci", "muski", "fertilnosti-muskarci"],
  },
  {
    label: "Prezervacija fertilnosti – žene",
    slugHints: ["fertilnosti-zene", "zene", "zene-prezervacija", "prezervacija-zene"],
  },
  {
    label: "Deca pre puberteta",
    slugHints: ["deca", "djeca", "pre-puberteta", "puberteta", "prije-puberteta", "pre-puberteta"],
  },
];

/** Četiri linka kao na referentnom mega meniju „Trudnoća“. */
const COL_TRUDNOCA: LinkDef[] = [
  {
    label: "Redovni pregledi trudnoće",
    slugHints: ["redovni-pregledi", "pregledi-trudnoce", "pregledi-trudnoci", "trudnoce"],
  },
  {
    label: "Spontani pobačaj",
    slugHints: ["spontani", "pobacaj", "pobačaj", "spontani-pobacaj", "pobacaji"],
  },
  {
    label: "Prevremeni porođaj",
    slugHints: ["prevremeni", "porodaj", "porođaj", "prevremeni-porodaj"],
  },
  {
    label: "Patološka stanja u trudnoći",
    slugHints: [
      "patoloska-stanja",
      "patoloska",
      "patologija",
      "stanja-u-trudnoci",
      "trudnoci",
    ],
  },
];

const COL_TITLE_KEYS: SiteStringKey[] = [
  "footer.col_infertility",
  "footer.col_iui_ivf_nav",
  "footer.col_ginekologija_nav",
  "footer.col_trudnoca_nav",
  "footer.col_preservacija_nav",
];

const COL_DEFS: LinkDef[][] = [
  COL_INFERTILITY,
  COL_IUI_IVF,
  COL_GINEKOLOGIJA,
  COL_TRUDNOCA,
  COL_PRESERVACIJA,
];

/**
 * Pet navigacionih kolona (Infertilitet, IUI/IVF, Ginekologija, Trudnoća, Prezervacija).
 */
export function buildFooterStructuredColumns(
  s: Record<SiteStringKey, string>,
  pages: FooterPageRow[],
  locale: Locale,
): FooterColumnData[] {
  return COL_DEFS.map((defs, i) => ({
    title: s[COL_TITLE_KEYS[i]!] ?? "",
    links: resolveLabels(locale, defs, pages),
  }));
}

export function resolveFooterContactPageHref(
  locale: Locale,
  pages: FooterPageRow[],
): string | null {
  const hit = findPageForHints(pages, ["kontakt", "contact"]);
  return hit ? resolvePublicHref(locale, `/s/${hit.slug}`) : null;
}

/**
 * Isti redoslijed i labeli kao u footer koloni „IUI i IVF“ — za header mega meni.
 */
export function buildIuiIvfHeaderLinkRows(
  locale: Locale,
  pages: FooterPageRow[],
): { label: string; href: string }[] {
  return resolveLabels(locale, COL_IUI_IVF, pages).map((x) => ({
    label: x.label,
    href: x.href ?? "#",
  }));
}

/**
 * Isti redoslijed kao u footer koloni „Prezervacija fertilnosti“ — za header mega meni.
 */
export function buildPrezervacijaHeaderLinkRows(
  locale: Locale,
  pages: FooterPageRow[],
): { label: string; href: string }[] {
  return resolveLabels(locale, COL_PRESERVACIJA, pages).map((x) => ({
    label: x.label,
    href: x.href ?? "#",
  }));
}

/**
 * Isti redoslijed kao u footer koloni „Trudnoća“ — za header mega meni.
 */
export function buildTrudnocaHeaderLinkRows(
  locale: Locale,
  pages: FooterPageRow[],
): { label: string; href: string }[] {
  return resolveLabels(locale, COL_TRUDNOCA, pages).map((x) => ({
    label: x.label,
    href: x.href ?? "#",
  }));
}

/**
 * Isti redoslijed kao u footer koloni „Ginekologija“ — za header mega meni.
 */
export function buildGinekologijaHeaderLinkRows(
  locale: Locale,
  pages: FooterPageRow[],
): { label: string; href: string }[] {
  return resolveLabels(locale, COL_GINEKOLOGIJA, pages).map((x) => ({
    label: x.label,
    href: x.href ?? "#",
  }));
}
