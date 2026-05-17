/**
 * Uklanja lične Gmail adrese (dusan.radevic / dusan.radovic) iz CMS tekstova u bazi.
 * Pokretanje: npm run db:strip-personal-email
 */
import "./load-dotenv";

import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { postTranslations, siteLocaleStrings } from "../lib/db/schema";
import { SITE_STRING_DEFAULTS } from "../lib/site-fields";

const CANONICAL_EMAIL = SITE_STRING_DEFAULTS.me["contact.email"];

function containsBanned(s: string): boolean {
  return /dusan\.radevic@gmail\.com|dusan\.radovic@gmail\.com/i.test(s);
}

function stripFromPlain(s: string): string {
  return s
    .replace(/dusan\.radevic@gmail\.com|dusan\.radovic@gmail\.com/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .trim();
}

function stripFromHtml(s: string): string {
  let t = s.replace(/dusan\.radevic@gmail\.com|dusan\.radovic@gmail\.com/gi, "");
  t = t.replace(
    /mailto:\s*dusan\.(radevic|radovic)@gmail\.com/gi,
    `mailto:${CANONICAL_EMAIL}`,
  );
  t = t.replace(/\s{2,}/g, " ");
  return t;
}

async function main() {
  let nLocale = 0;
  const localeRows = await db.select().from(siteLocaleStrings);
  for (const row of localeRows) {
    if (!containsBanned(row.value)) continue;
    const next =
      row.fieldKey === "contact.email"
        ? CANONICAL_EMAIL
        : stripFromPlain(row.value);
    if (next === row.value) continue;
    await db
      .update(siteLocaleStrings)
      .set({ value: next, updatedAt: new Date() })
      .where(eq(siteLocaleStrings.id, row.id));
    nLocale++;
    console.log("site_locale_strings:", row.fieldKey, row.locale);
  }

  let nPosts = 0;
  const posts = await db.select().from(postTranslations);
  for (const row of posts) {
    const nextTitle =
      row.title && containsBanned(row.title) ? stripFromPlain(row.title) : undefined;
    const nextExcerpt =
      row.excerpt && containsBanned(row.excerpt)
        ? stripFromPlain(row.excerpt)
        : undefined;
    const nextBody =
      row.body && containsBanned(row.body) ? stripFromHtml(row.body) : undefined;
    const nextMetaTitle =
      row.metaTitle && containsBanned(row.metaTitle)
        ? stripFromPlain(row.metaTitle)
        : undefined;
    const nextMetaDesc =
      row.metaDescription && containsBanned(row.metaDescription)
        ? stripFromPlain(row.metaDescription)
        : undefined;
    if (
      nextTitle === undefined &&
      nextExcerpt === undefined &&
      nextBody === undefined &&
      nextMetaTitle === undefined &&
      nextMetaDesc === undefined
    ) {
      continue;
    }
    await db
      .update(postTranslations)
      .set({
        ...(nextTitle !== undefined ? { title: nextTitle } : {}),
        ...(nextExcerpt !== undefined ? { excerpt: nextExcerpt || null } : {}),
        ...(nextBody !== undefined ? { body: nextBody } : {}),
        ...(nextMetaTitle !== undefined ? { metaTitle: nextMetaTitle || null } : {}),
        ...(nextMetaDesc !== undefined
          ? { metaDescription: nextMetaDesc || null }
          : {}),
      })
      .where(eq(postTranslations.id, row.id));
    nPosts++;
    console.log("post_translations:", row.locale, row.slug);
  }

  console.log("Gotovo.", { siteLocaleStrings: nLocale, postTranslations: nPosts });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
