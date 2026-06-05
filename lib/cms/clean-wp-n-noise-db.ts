import { eq } from "drizzle-orm";

import {
  preparePublicPlainText,
  stripNPlaceholderBlocks,
} from "@/lib/public-cms-html";
import { db } from "@/lib/db";
import {
  homeServiceCardTranslations,
  homeTeamHighlightTranslations,
  mediaAltTranslations,
  navLinkTranslations,
  postTranslations,
  siteLocaleStrings,
  sitePageTranslations,
} from "@/lib/db/schema";
import { sanitizeWordPressContent } from "@/scripts/lib/sanitize-wordpress-content";

export type CleanWpNNoiseResult = {
  updated: number;
  byTable: Record<string, number>;
};

/** Brza provjera prije skupog HTML pipeline-a. */
function likelyHasNNoise(raw: string | null | undefined): boolean {
  if (raw == null || raw === "") return false;
  return /(?:^|[\s<>/])n{2,}(?:[\s<>/]|$)|(?:^|[\s])n(?:[\s]|$)|nnn|&#(?:x6e|110);/i.test(raw);
}

function cleanBody(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return raw;
  if (!likelyHasNNoise(raw)) return raw;
  const cleaned = stripNPlaceholderBlocks(
    sanitizeWordPressContent(raw, { contentKind: "html" }),
  );
  return cleaned.trim() === "" ? null : cleaned;
}

function cleanPlain(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return raw;
  if (!likelyHasNNoise(raw)) return raw;
  const cleaned = preparePublicPlainText(raw);
  return cleaned.trim() === "" ? null : cleaned;
}

function cleanShort(raw: string | null, maxLen: number): string | null {
  if (raw == null || raw.trim() === "") return raw;
  const cleaned = preparePublicPlainText(raw).trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

/** Uklanja WP uvoz artefakte „n“, „nnn“ iz svih CMS tekstualnih polja u bazi. */
export async function cleanWpNNoiseInDatabase(): Promise<CleanWpNNoiseResult> {
  let updated = 0;
  const byTable: Record<string, number> = {};

  function bump(table: string) {
    byTable[table] = (byTable[table] ?? 0) + 1;
    updated += 1;
  }

  const posts = await db.select().from(postTranslations);
  for (const row of posts) {
    if (
      !likelyHasNNoise(row.title) &&
      !likelyHasNNoise(row.excerpt) &&
      !likelyHasNNoise(row.body) &&
      !likelyHasNNoise(row.metaTitle) &&
      !likelyHasNNoise(row.metaDescription)
    ) {
      continue;
    }
    const patch = {
      title: cleanShort(row.title, 500) ?? row.title,
      excerpt: cleanPlain(row.excerpt),
      body: cleanBody(row.body),
      metaTitle: cleanShort(row.metaTitle, 255),
      metaDescription: cleanShort(row.metaDescription, 512),
    };
    if (
      patch.title !== row.title ||
      patch.excerpt !== row.excerpt ||
      patch.body !== row.body ||
      patch.metaTitle !== row.metaTitle ||
      patch.metaDescription !== row.metaDescription
    ) {
      await db
        .update(postTranslations)
        .set(patch)
        .where(eq(postTranslations.id, row.id));
      bump("post_translations");
    }
  }

  const pages = await db.select().from(sitePageTranslations);
  for (const row of pages) {
    if (!likelyHasNNoise(row.title) && !likelyHasNNoise(row.body)) continue;
    const patch = {
      title: cleanShort(row.title, 500) ?? row.title,
      body: cleanBody(row.body),
    };
    if (patch.title !== row.title || patch.body !== row.body) {
      await db
        .update(sitePageTranslations)
        .set(patch)
        .where(eq(sitePageTranslations.id, row.id));
      bump("site_page_translations");
    }
  }

  const strings = await db.select().from(siteLocaleStrings);
  for (const row of strings) {
    if (!likelyHasNNoise(row.value)) continue;
    const raw = row.value ?? "";
    const next =
      raw.includes("<") || raw.includes("&nbsp;")
        ? (cleanPlain(raw) ?? cleanBody(raw))
        : cleanPlain(raw);
    if (next !== row.value) {
      await db
        .update(siteLocaleStrings)
        .set({ value: next ?? "" })
        .where(eq(siteLocaleStrings.id, row.id));
      bump("site_locale_strings");
    }
  }

  const cards = await db.select().from(homeServiceCardTranslations);
  for (const row of cards) {
    if (!likelyHasNNoise(row.title) && !likelyHasNNoise(row.description)) continue;
    const patch = {
      title: cleanShort(row.title, 500) ?? "",
      description: cleanPlain(row.description),
    };
    if (patch.title !== row.title || patch.description !== row.description) {
      await db
        .update(homeServiceCardTranslations)
        .set(patch)
        .where(eq(homeServiceCardTranslations.id, row.id));
      bump("home_service_card_translations");
    }
  }

  const highlights = await db.select().from(homeTeamHighlightTranslations);
  for (const row of highlights) {
    if (!likelyHasNNoise(row.title) && !likelyHasNNoise(row.teaser)) continue;
    const patch = {
      title: cleanShort(row.title, 500) ?? "",
      teaser: cleanPlain(row.teaser),
    };
    if (patch.title !== row.title || patch.teaser !== row.teaser) {
      await db
        .update(homeTeamHighlightTranslations)
        .set(patch)
        .where(eq(homeTeamHighlightTranslations.id, row.id));
      bump("home_team_highlight_translations");
    }
  }

  const nav = await db.select().from(navLinkTranslations);
  for (const row of nav) {
    if (!likelyHasNNoise(row.label)) continue;
    const next = cleanShort(row.label, 255);
    if (next !== row.label) {
      await db
        .update(navLinkTranslations)
        .set({ label: next ?? row.label })
        .where(eq(navLinkTranslations.id, row.id));
      bump("nav_link_translations");
    }
  }

  const alts = await db.select().from(mediaAltTranslations);
  for (const row of alts) {
    if (!likelyHasNNoise(row.altText)) continue;
    const next = cleanShort(row.altText, 512) ?? "";
    if (next !== row.altText) {
      await db
        .update(mediaAltTranslations)
        .set({ altText: next })
        .where(eq(mediaAltTranslations.id, row.id));
      bump("media_alt_translations");
    }
  }

  return { updated, byTable };
}
