"use client";

import { createPostWithTranslations } from "@/app/admin/(authed)/posts/new/actions";
import type { MediaOption } from "@/lib/queries/media-admin";
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

const emptyForm: ArticleFormValues = {
  published: false,
  coverMediaId: "",
  me: { ...defaultLocaleBlock },
  en: { ...defaultLocaleBlock },
  ru: { ...defaultLocaleBlock },
  tr: { ...defaultLocaleBlock },
};

type Props = {
  mediaOptions: MediaOption[];
};

export function CreateArticleForm({ mediaOptions }: Props) {
  return (
    <ArticleEditorForm
      mediaOptions={mediaOptions}
      initialValues={emptyForm}
      onSubmit={createPostWithTranslations}
      submitLabel="Snimi članak (sva 4 jezika)"
      successMessage={(id) =>
        `Sačuvano. ID članka: ${id}`
      }
      resetOnSuccess
    />
  );
}
