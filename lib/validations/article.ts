import { z } from "zod";

import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug je obavezan")
  .max(255, "Slug je predugačak");

const primaryArticleLocaleSchema = z.object({
  slug: slugSchema,
  title: z
    .string()
    .trim()
    .min(1, "Naslov je obavezan")
    .max(500, "Naslov je predugačak"),
  excerpt: z.string().max(65535).optional(),
  body: z.string().max(16777215).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(512).optional(),
});

/** Ostali jezici (npr. EN): prazan blok je dozvoljen — red se ne čuva u bazi. */
const optionalArticleLocaleSchema = z
  .object({
    slug: z.string().trim().max(255),
    title: z.string().trim().max(500),
    excerpt: z.string().max(65535).optional(),
    body: z.string().max(16777215).optional(),
    metaTitle: z.string().max(255).optional(),
    metaDescription: z.string().max(512).optional(),
  })
  .superRefine((data, ctx) => {
    const slug = data.slug.trim();
    const title = data.title.trim();
    const extras =
      (data.excerpt ?? "").trim().length > 0 ||
      (data.body ?? "").trim().length > 0 ||
      (data.metaTitle ?? "").trim().length > 0 ||
      (data.metaDescription ?? "").trim().length > 0;
    if (!slug && !title && !extras) return;
    if (!slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Slug je obavezan ako je unesen prijevod.",
        path: ["slug"],
      });
    }
    if (!title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Naslov je obavezan ako je unesen prijevod.",
        path: ["title"],
      });
    }
  });

const coverIdSchema = z
  .string()
  .trim()
  .refine((s) => s === "" || z.string().uuid().safeParse(s).success, {
    message: "Nevažeći ID medija",
  });

export const articleFormSchema = z.object({
  published: z.boolean(),
  coverMediaId: coverIdSchema,
  me: primaryArticleLocaleSchema,
  en: optionalArticleLocaleSchema,
  ru: optionalArticleLocaleSchema,
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

export type ArticleMutationResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

/** Da li za jezik treba upsert red u `post_translations` (osnovni jezik uvijek da). */
export function shouldPersistArticleTranslation(
  locale: Locale,
  block: Pick<ArticleFormValues[Locale], "slug" | "title">,
): boolean {
  if (locale === defaultLocale) return true;
  return block.slug.trim().length > 0 && block.title.trim().length > 0;
}
