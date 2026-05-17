/**
 * Povezuje header navigaciju sa STRANICAMA (site_pages) po nazivu iz admina.
 *
 * Za svaku stavku menija sa placement=header uzima label iz nav_link_translations (po jeziku),
 * traži site_page_translations.title koji se poklapa (case-insensitive, isti “normalizovani” tekst),
 * i postavlja nav_links.href na /s/<slug> te stranice.
 *
 * Ako ima više stranica sa istim naslovom, pokušava razlikovanje preko postojećeg href ako je već /s/slug.
 * Ako i dalje nejasno nakon svih jezika: pokušava slugify(label) === site_pages.slug.
 *
 *   npm run nav:link-header-pages
 *   npm run nav:link-header-pages -- --dry-run
 *   npm run nav:link-header-pages -- --sync-labels   (label u meniju = naslov stranice za taj jezik)
 */
import "./load-dotenv";

import { asc, eq } from "drizzle-orm";

import { db } from "../lib/db";
import {
  navLinkTranslations,
  navLinks,
  sitePageTranslations,
  sitePages,
} from "../lib/db/schema";
import type { Locale } from "../lib/i18n";
import { defaultLocale, locales } from "../lib/i18n";
import { slugifyTitle } from "../lib/slugify";

function normalizeLabel(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normTitleKey(s: string): string {
  return normalizeLabel(s).toLowerCase();
}

function slugFromHref(href: string): string | null {
  const h = href
    .trim()
    .replace(/^\/(?:me|en|ru|tr)(?=\/)/i, "");
  const m = h.match(/^\/s\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]!) : null;
}

type PageRow = {
  slug: string;
  title: string;
  locale: string;
  pageId: string;
};

function pickUnique(
  candidates: PageRow[],
  currentHref: string,
): PageRow | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;

  const fromHref = slugFromHref(currentHref);
  if (fromHref) {
    const bySlug = candidates.filter((c) => c.slug === fromHref);
    if (bySlug.length === 1) return bySlug[0]!;
  }

  return null;
}

function pageTitleForLocale(
  pageId: string,
  locale: string,
  pages: PageRow[],
): string {
  const exact = pages.find(
    (p) => p.pageId === pageId && p.locale === locale,
  );
  if (exact) return exact.title;
  const fallback = pages.find(
    (p) => p.pageId === pageId && p.locale === defaultLocale,
  );
  return fallback?.title ?? pages.find((p) => p.pageId === pageId)?.title ?? "";
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const syncLabels = process.argv.includes("--sync-labels");

  const pageRows = await db
    .select({
      slug: sitePages.slug,
      title: sitePageTranslations.title,
      locale: sitePageTranslations.locale,
      pageId: sitePages.id,
    })
    .from(sitePages)
    .innerJoin(
      sitePageTranslations,
      eq(sitePageTranslations.pageId, sitePages.id),
    )
    .where(eq(sitePages.published, true));

  const byTitle = new Map<string, PageRow[]>();
  for (const row of pageRows) {
    const k = normTitleKey(row.title);
    if (k.length > 0) {
      const list = byTitle.get(k) ?? [];
      list.push(row);
      byTitle.set(k, list);
    }
  }

  const bySlug = new Map<string, PageRow>();
  for (const row of pageRows) {
    const existing = bySlug.get(row.slug);
    if (!existing) {
      bySlug.set(row.slug, row);
    } else if (
      row.locale === defaultLocale &&
      existing.locale !== defaultLocale
    ) {
      bySlug.set(row.slug, row);
    }
  }

  const headerLinks = await db
    .select()
    .from(navLinks)
    .where(eq(navLinks.placement, "header"))
    .orderBy(asc(navLinks.sortOrder), asc(navLinks.id));

  const allTrans = await db.select().from(navLinkTranslations);
  const transByLink = new Map<string, typeof allTrans>();
  for (const t of allTrans) {
    const list = transByLink.get(t.navLinkId) ?? [];
    list.push(t);
    transByLink.set(t.navLinkId, list);
  }

  let hrefUpdated = 0;
  let labelUpdated = 0;
  let skippedOk = 0;
  let skippedNoMatch = 0;
  let skippedAmbiguous = 0;

  const wantedLocales = locales as readonly Locale[];

  for (const link of headerLinks) {
    const rows = transByLink.get(link.id) ?? [];

    let resolvedPage: PageRow | null = null;
    let sawAmbiguousCandidates = false;

    for (const loc of wantedLocales) {
      const tr = rows.find((r) => r.locale === loc);
      const label = normalizeLabel(tr?.label ?? "");
      if (!label) continue;

      const key = normTitleKey(label);
      const candidates = byTitle.get(key) ?? [];
      if (candidates.length === 0) continue;

      const picked = pickUnique(candidates, link.href);
      if (picked) {
        resolvedPage = picked;
        break;
      }
      if (candidates.length > 1) sawAmbiguousCandidates = true;
    }

    if (!resolvedPage) {
      for (const loc of wantedLocales) {
        const tr = rows.find((r) => r.locale === loc);
        const label = normalizeLabel(tr?.label ?? "");
        if (!label) continue;
        const slugGuess = slugifyTitle(label);
        if (!slugGuess) continue;
        const row = bySlug.get(slugGuess);
        if (row) {
          resolvedPage = row;
          break;
        }
      }
    }

    if (!resolvedPage) {
      if (sawAmbiguousCandidates) {
        skippedAmbiguous++;
        const sample = normalizeLabel(rows[0]?.label ?? "");
        console.warn(
          `[nav] Dvosmislen naslov (više stranica) za „${sample.slice(0, 70)}“ — stavka ${link.id.slice(0, 8)}… href=${link.href}`,
        );
      } else {
        skippedNoMatch++;
        console.warn(
          `[nav] Nema objavljene stranice koja odgovara nazivu menija — ${link.id.slice(0, 8)}… href=${link.href} label=${JSON.stringify(rows[0]?.label ?? "")}`,
        );
      }
      continue;
    }

    const newHref = `/s/${resolvedPage.slug}`;
    const hrefNeeds = normalizeLabel(link.href) !== normalizeLabel(newHref);

    if (!hrefNeeds) {
      skippedOk++;
    } else {
      if (dryRun) {
        console.log(
          `[dry-run] href ${link.href} → ${newHref} (${resolvedPage.title.slice(0, 80)})`,
        );
      } else {
        await db
          .update(navLinks)
          .set({ href: newHref, updatedAt: new Date() })
          .where(eq(navLinks.id, link.id));
      }
      hrefUpdated++;
    }

    if (syncLabels) {
      const pageId = resolvedPage.pageId;
      for (const tr of rows) {
        const want = pageTitleForLocale(pageId, tr.locale, pageRows).slice(
          0,
          255,
        );
        if (!want || normalizeLabel(tr.label) === normalizeLabel(want)) continue;
        if (dryRun) {
          console.log(
            `[dry-run] label [${tr.locale}] → ${JSON.stringify(want.slice(0, 70))}`,
          );
          labelUpdated++;
        } else {
          await db
            .update(navLinkTranslations)
            .set({ label: want })
            .where(eq(navLinkTranslations.id, tr.id));
          labelUpdated++;
        }
      }
    }
  }

  console.log(
    dryRun
      ? `Dry-run: href ${hrefUpdated}, label ${labelUpdated}, već OK ${skippedOk}, bez stranice ${skippedNoMatch}, dvosmisleno ${skippedAmbiguous}.`
      : `Href ažurirano ${hrefUpdated}, label ${labelUpdated}, već OK ${skippedOk}, bez stranice ${skippedNoMatch}, dvosmisleno ${skippedAmbiguous}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
