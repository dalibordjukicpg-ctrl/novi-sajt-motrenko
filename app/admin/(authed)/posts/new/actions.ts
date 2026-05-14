"use server";

import { randomUUID } from "crypto";

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

export async function createPostWithTranslations(
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
  const postId = randomUUID();
  const now = new Date();
  const publishedAt = data.published ? now : null;
  const coverMediaId =
    data.coverMediaId === "" ? null : data.coverMediaId;

  const locales = ["me", "en", "ru", "tr"] as const;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(posts).values({
        id: postId,
        published: data.published,
        publishedAt,
        coverMediaId,
        createdAt: now,
        updatedAt: now,
      });

      for (const locale of locales) {
        const block = data[locale];
        await tx.insert(postTranslations).values({
          id: randomUUID(),
          postId,
          locale,
          slug: block.slug.trim(),
          title: block.title.trim(),
          excerpt: norm(block.excerpt ?? ""),
          body: norm(block.body ?? ""),
          metaTitle: norm(block.metaTitle ?? ""),
          metaDescription: norm(block.metaDescription ?? ""),
        });
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
