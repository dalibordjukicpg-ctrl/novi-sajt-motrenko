import type { Locale } from "@/lib/i18n";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import type { SiteStringKey } from "@/lib/site-fields";

export type FooterPageRow = {
  slug: string;
  title: string;
  headerNavGroup?: string | null;
};

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

/**
 * Pronađi CMS stranicu za footer/header link.
 * Rangiranje umjesto prvog „substring“ pogotka — npr. „stimulacija“ ne smije završiti na slug `tim`
 * jer `"stimulacijaovulacije".includes("tim")`.
 */
function findPageForHints(
  pages: FooterPageRow[],
  hints: string[],
): FooterPageRow | null {
  let best: { page: FooterPageRow; score: number } | null = null;

  for (const raw of hints) {
    const c = normMatch(raw);
    if (!c) continue;

    for (const p of pages) {
      const ns = normMatch(p.slug);
      const nt = normMatch(p.title);

      let score = 0;
      if (ns === c) {
        score = 100;
      } else if (c.length >= 4 && ns.includes(c)) {
        score = 80;
      } else if (ns.length >= 4 && c.includes(ns)) {
        score = 60;
      } else if (c.length >= 4 && nt.includes(c)) {
        score = 40;
      }

      if (score > (best?.score ?? 0)) {
        best = { page: p, score };
      }
    }
  }

  return best?.page ?? null;
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

function slugsFromLinks(links: { href: string | null }[]): Set<string> {
  const used = new Set<string>();
  for (const l of links) {
    const h = l.href?.trim() ?? "";
    const m = h.match(/\/s\/([^/?#]+)/i);
    if (m?.[1]) used.add(normMatch(m[1]));
  }
  return used;
}

/** Objavljene CMS stranice iz iste grupe (npr. Histeroskopija) koje nisu već u kanonskoj listi. */
function mergeExtraCmsPages(
  links: { label: string; href: string | null }[],
  pages: FooterPageRow[],
  groupKey: string,
  locale: Locale,
): { label: string; href: string | null }[] {
  const g = groupKey.trim();
  if (!g) return links.filter((l) => l.href);

  const used = slugsFromLinks(links);
  const resolved = links.filter((l) => l.href);
  const extras = pages
    .filter((p) => (p.headerNavGroup ?? "").trim() === g)
    .filter((p) => !used.has(normMatch(p.slug)))
    .sort((a, b) =>
      (a.title ?? a.slug).localeCompare(b.title ?? b.slug, "sr"),
    )
    .map((p) => ({
      label: (p.title ?? "").trim() || p.slug,
      href: resolvePublicHref(locale, `/s/${p.slug}`),
    }));

  return [...resolved, ...extras];
}

function buildColumnLinks(
  locale: Locale,
  defs: LinkDef[],
  pages: FooterPageRow[],
  groupKey: string,
): { label: string; href: string | null }[] {
  const resolved = resolveLabels(locale, defs, pages);
  return mergeExtraCmsPages(resolved, pages, groupKey, locale);
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
  {
    label: "Krioprezervacija embriona – Zamrzavanje embriona (vitrifikacija embriona)",
    slugHints: [
      "krioprezervacija",
      "vitrifikacija",
      "zamrzavanje-embriona",
      "zamrzavanje",
    ],
  },
  { label: "Donacija oocita", slugHints: ["donacija-oocita", "oocita"] },
  {
    label: "Donacije sperme",
    slugHints: ["donacije-sperme", "donacija-sperme", "sperme"],
  },
  {
    label: "Donacije embriona",
    slugHints: ["donacije-embriona", "donacija-embriona"],
  },
  { label: "Dodatne tehnike", slugHints: ["dodatne-tehnike", "tehnike"] },
];

/** WP meni „Ginekologija“ + nove CMS stranice iz grupe ginekologija. */
const COL_GINEKOLOGIJA: LinkDef[] = [
  { label: "Pregledi", slugHints: ["pregledi"] },
  {
    label: "Ginekološke intervencije i operacije",
    slugHints: ["ginekoloske-intervencije", "intervencije-i-operacije"],
  },
  { label: "Histeroskopija", slugHints: ["histeroskopija", "histeroskop"] },
];

/** WP meni „O nama“. */
const COL_ABOUT: LinkDef[] = [
  { label: "Opšti podaci", slugHints: ["opsti-podaci"] },
  { label: "Tim", slugHints: ["tim", "nas-tim"] },
  { label: "Aktivnosti centra", slugHints: ["aktivnosti-centra"] },
  {
    label: "Ustanove sa kojima sarađujemo",
    slugHints: ["ustanove-sa-kojima-saradujemo", "ustanove", "saradujemo"],
  },
  {
    label: "Edukacija i naučno-istraživački rad",
    slugHints: ["edukacija-i-naucno-istrazivacki-rad", "edukacija", "istrazivacki"],
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
  "footer.col_about_nav",
  "footer.col_infertility",
  "footer.col_iui_ivf_nav",
  "footer.col_ginekologija_nav",
  "footer.col_trudnoca_nav",
  "footer.col_preservacija_nav",
];

const COL_DEFS: LinkDef[][] = [
  COL_ABOUT,
  COL_INFERTILITY,
  COL_IUI_IVF,
  COL_GINEKOLOGIJA,
  COL_TRUDNOCA,
  COL_PRESERVACIJA,
];

/** Grupa u adminu (`header_nav_group`) za automatsko dodavanje novih stranica. */
const COL_GROUP_KEYS = [
  "",
  "infertilitet",
  "iui_ivf",
  "ginekologija",
  "trudnoca",
  "prezervacija",
] as const;

/**
 * Navigacione kolone u footeru — usklađeno sa WP menijem + CMS stranice po grupi.
 */
export function buildFooterStructuredColumns(
  s: Record<SiteStringKey, string>,
  pages: FooterPageRow[],
  locale: Locale,
): FooterColumnData[] {
  return COL_DEFS.map((defs, i) => ({
    title: s[COL_TITLE_KEYS[i]!] ?? "",
    links: buildColumnLinks(locale, defs, pages, COL_GROUP_KEYS[i] ?? ""),
  })).filter((col) => col.title.trim().length > 0 && col.links.length > 0);
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
  return buildColumnLinks(locale, COL_IUI_IVF, pages, "iui_ivf").map((x) => ({
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
  return buildColumnLinks(locale, COL_PRESERVACIJA, pages, "prezervacija").map(
    (x) => ({
      label: x.label,
      href: x.href ?? "#",
    }),
  );
}

/**
 * Isti redoslijed kao u footer koloni „Trudnoća“ — za header mega meni.
 */
export function buildTrudnocaHeaderLinkRows(
  locale: Locale,
  pages: FooterPageRow[],
): { label: string; href: string }[] {
  return buildColumnLinks(locale, COL_TRUDNOCA, pages, "trudnoca").map((x) => ({
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
  return buildColumnLinks(locale, COL_GINEKOLOGIJA, pages, "ginekologija").map(
    (x) => ({
      label: x.label,
      href: x.href ?? "#",
    }),
  );
}
