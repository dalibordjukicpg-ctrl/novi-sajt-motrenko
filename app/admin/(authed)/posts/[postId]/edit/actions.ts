"use server";

import { and, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { postTranslations, posts } from "@/lib/db/schema";
import { revalidateArticlePaths } from "@/lib/revalidate-content";
import {
  articleFormSchema,
  type ArticleMutationResult,
} from "@/lib/validations/article";

function norm(s: string | undefined): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export async function updatePostWithTranslations(
  postId: string,
  raw: unknown,
): Promise<ArticleMutationResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Niste prijavljeni." };
  }

  const parsed = articleFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = Object.values(first).flat()[0];
    return { ok: false, error: msg ?? "Neispravni podaci." };
  }

  const data = parsed.data;
  const now = new Date();
  const coverMediaId =
    data.coverMediaId === "" ? null : data.coverMediaId;

  const [existing] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existing) {
    return { ok: false, error: "Članak nije pronađen." };
  }

  let publishedAt = existing.publishedAt;
  if (data.published && !existing.published) {
    publishedAt = now;
  }
  if (!data.published) {
    publishedAt = null;
  }

  const locales = ["me", "en", "ru", "tr"] as const;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          published: data.published,
          publishedAt,
          updatedAt: now,
          coverMediaId,
        })
        .where(eq(posts.id, postId));

      for (const locale of locales) {
        const block = data[locale];
        await tx
          .update(postTranslations)
          .set({
            slug: block.slug.trim(),
            title: block.title.trim(),
            excerpt: norm(block.excerpt ?? ""),
            body: norm(block.body ?? ""),
            metaTitle: norm(block.metaTitle ?? ""),
            metaDescription: norm(block.metaDescription ?? ""),
          })
          .where(
            and(
              eq(postTranslations.postId, postId),
              eq(postTranslations.locale, locale),
            ),
          );
      }
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "ER_DUP_ENTRY") {
      return {
        ok: false,
        error:
          "Duplikat sluga za neki jezik (slug mora biti jedinstven po jeziku).",
      };
    }
    console.error(e);
    return { ok: false, error: "Čuvanje nije uspjelo. Pokušajte ponovo." };
  }

  revalidateArticlePaths(data);
  return { ok: true, postId };
}
