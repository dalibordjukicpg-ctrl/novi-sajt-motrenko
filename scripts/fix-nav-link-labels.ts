/**
 * Jednokratno: popravi nav_link_translations kad je label prazan, numerički ili "Link",
 * koristeći naslov strane iz baze ili humanizovani slug iz href (isto kao import:wordpress).
 *
 *   npm run nav:fix-labels
 *   npm run nav:fix-labels -- --dry-run
 */
import "./load-dotenv";

import { and, asc, eq } from "drizzle-orm";

import { db } from "../lib/db";
import {
  navLinkTranslations,
  navLinks,
  postTranslations,
  sitePageTranslations,
  sitePages,
} from "../lib/db/schema";
import { locales, type Locale } from "../lib/i18n";

function normalizeLabel(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBadMenuLabel(label: string): boolean {
  const t = normalizeLabel(label);
  return t.length === 0 || /^\d+$/.test(t);
}

function humanizeSlugSegment(slug: string): string {
  const s = decodeURIComponent(slug).trim();
  if (!s || /^\d+$/.test(s)) return "";
  return s
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower.length <= 4 && /^[a-z]+$/.test(lower)) return lower.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function slugFromHref(href: string): { kind: "page" | "post"; slug: string } | null {
  const h = href
    .trim()
    .replace(/^\/(?:me|en|ru|tr)(?=\/)/i, "");
  const page = h.match(/^\/s\/([^/?#]+)/i);
  if (page?.[1]) return { kind: "page", slug: decodeURIComponent(page[1]) };
  const post = h.match(/^\/posts\/([^/?#]+)/i);
  if (post?.[1]) return { kind: "post", slug: decodeURIComponent(post[1]) };
  return null;
}

async function resolveTitleFromContentDb(
  parsed: { kind: "page" | "post"; slug: string },
  locale: Locale,
): Promise<string | null> {
  if (parsed.kind === "page") {
    const pages = await db
      .select({ id: sitePages.id })
      .from(sitePages)
      .where(eq(sitePages.slug, parsed.slug))
      .limit(1);
    const pid = pages[0]?.id;
    if (!pid) return null;
    const trs = await db
      .select({ title: sitePageTranslations.title })
      .from(sitePageTranslations)
      .where(
        and(
          eq(sitePageTranslations.pageId, pid),
          eq(sitePageTranslations.locale, locale),
        ),
      )
      .limit(1);
    const t = normalizeLabel(trs[0]?.title ?? "");
    return t.length > 0 ? t : null;
  }

  const rows = await db
    .select({ title: postTranslations.title })
    .from(postTranslations)
    .where(
      and(
        eq(postTranslations.locale, locale),
        eq(postTranslations.slug, parsed.slug),
      ),
    )
    .limit(1);
  const t = normalizeLabel(rows[0]?.title ?? "");
  return t.length > 0 ? t : null;
}

function fallbackFromHref(href: string): string {
  const parsed = slugFromHref(href);
  if (!parsed) return "";
  return humanizeSlugSegment(parsed.slug);
}

async function suggestedLabel(
  href: string,
  locale: Locale,
): Promise<string | null> {
  const parsed = slugFromHref(href);
  if (parsed) {
    const fromDb = await resolveTitleFromContentDb(parsed, locale);
    if (fromDb) return fromDb.slice(0, 255);
  }
  const h = fallbackFromHref(href);
  return h ? h.slice(0, 255) : null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const links = await db
    .select()
    .from(navLinks)
    .orderBy(asc(navLinks.sortOrder), asc(navLinks.id));

  if (links.length === 0) {
    console.log("nav_links je prazan.");
    return;
  }

  const trans = await db.select().from(navLinkTranslations);
  type TransRow = (typeof trans)[number];
  const byLink = new Map<string, TransRow[]>();
  for (const t of trans) {
    const list = byLink.get(t.navLinkId) ?? [];
    list.push(t);
    byLink.set(t.navLinkId, list);
  }

  let updated = 0;
  let skipped = 0;

  for (const link of links) {
    const rows = byLink.get(link.id) ?? [];
    for (const row of rows) {
      const loc = row.locale as Locale;
      if (!locales.includes(loc as Locale)) continue;

      const cur = normalizeLabel(row.label);
      const needs =
        isBadMenuLabel(cur) || cur === "Link" || /^https?:\/\//i.test(cur);

      if (!needs) {
        skipped++;
        continue;
      }

      const next =
        (await suggestedLabel(link.href, loc)) ??
        (await suggestedLabel(link.href, "me")) ??
        null;

      if (!next || normalizeLabel(next) === cur) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(
          `[dry-run] ${link.id.slice(0, 8)}… [${loc}]`,
          JSON.stringify(cur),
          "→",
          JSON.stringify(next.slice(0, 80)),
        );
        updated++;
        continue;
      }

      await db
        .update(navLinkTranslations)
        .set({ label: next })
        .where(eq(navLinkTranslations.id, row.id));
      updated++;
    }
  }

  console.log(
    dryRun ? `Dry-run: ${updated} redova bi se ažuriralo, preskočeno ${skipped}.`
      : `Ažurirano ${updated} prevoda, preskočeno ${skipped} (već u redu).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
