import { z } from "zod";

import { locales } from "@/lib/i18n";

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug je obavezan")
  .max(255, "Slug je predugačak");

const perLocaleSchema = z.object({
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

const coverIdSchema = z
  .string()
  .trim()
  .refine((s) => s === "" || z.string().uuid().safeParse(s).success, {
    message: "Nevažeći ID medija",
  });

const articleLocaleShape = Object.fromEntries(
  locales.map((loc) => [loc, perLocaleSchema]),
) as Record<(typeof locales)[number], typeof perLocaleSchema>;

export const articleFormSchema = z.object({
  published: z.boolean(),
  coverMediaId: coverIdSchema,
  ...articleLocaleShape,
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

export type ArticleMutationResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };
