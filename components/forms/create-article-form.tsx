"use client";

import { createPostWithTranslations } from "@/app/admin/(authed)/posts/new/actions";
import type { MediaOption } from "@/lib/queries/media-admin";
import { locales } from "@/lib/i18n";
import type { ArticleFormValues } from "@/lib/validations/article";
import { ArticleEditorForm } from "./article-editor-form";

const defaultLocaleBlock = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  metaTitle: "",
  metaDescription: "",
};

const emptyForm = {
  published: false,
  coverMediaId: "",
  ...Object.fromEntries(
    locales.map((loc) => [loc, { ...defaultLocaleBlock }]),
  ),
} as ArticleFormValues;

type Props = {
  mediaOptions: MediaOption[];
};

export function CreateArticleForm({ mediaOptions }: Props) {
  return (
    <ArticleEditorForm
      mediaOptions={mediaOptions}
      initialValues={emptyForm}
      onSubmit={createPostWithTranslations}
      submitLabel="Snimi članak"
      successMessage={(id) =>
        `Sačuvano. ID članka: ${id}`
      }
      resetOnSuccess
    />
  );
}
