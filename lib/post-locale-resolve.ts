import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { postTranslations, posts } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";

/**
 * Objavljeni post po slug-u u URL-u: prvo traženi jezik, pa osnovni, pa bilo koji red
 * (isti slug može postojati u različitim jezicima za isti post).
 */
export async function resolvePublishedPostIdForSlug(
  slug: string,
  preferredLocale?: Locale,
): Promise<string | null> {
  const publishedSlug = and(
    eq(postTranslations.slug, slug),
    eq(posts.published, true),
  );

  if (preferredLocale) {
    const [byPreferred] = await db
      .select({ postId: posts.id })
      .from(postTranslations)
      .innerJoin(posts, eq(postTranslations.postId, posts.id))
      .where(and(publishedSlug, eq(postTranslations.locale, preferredLocale)))
      .limit(1);
    if (byPreferred) return byPreferred.postId;
  }

  const [byDefault] = await db
    .select({ postId: posts.id })
    .from(postTranslations)
    .innerJoin(posts, eq(postTranslations.postId, posts.id))
    .where(and(publishedSlug, eq(postTranslations.locale, defaultLocale)))
    .limit(1);
  if (byDefault) return byDefault.postId;

  const [anyHit] = await db
    .select({ postId: posts.id })
    .from(postTranslations)
    .innerJoin(posts, eq(postTranslations.postId, posts.id))
    .where(publishedSlug)
    .limit(1);
  return anyHit?.postId ?? null;
}

export async function getPostSlugForLocale(
  postId: string,
  locale: Locale,
): Promise<string | null> {
  const [row] = await db
    .select({ slug: postTranslations.slug })
    .from(postTranslations)
    .where(
      and(
        eq(postTranslations.postId, postId),
        eq(postTranslations.locale, locale),
      ),
    )
    .limit(1);
  const s = row?.slug?.trim();
  return s && s.length > 0 ? s : null;
}
