"use client";

import { updatePostWithTranslations } from "@/app/admin/(authed)/posts/[postId]/edit/actions";
import type { MediaOption } from "@/lib/queries/media-admin";
import type { ArticleFormValues } from "@/lib/validations/article";

import { ArticleEditorForm } from "./article-editor-form";

type Props = {
  postId: string;
  initialValues: ArticleFormValues;
  mediaOptions: MediaOption[];
};

export function EditArticleForm({ postId, initialValues, mediaOptions }: Props) {
  return (
    <ArticleEditorForm
      key={postId}
      mediaOptions={mediaOptions}
      initialValues={initialValues}
      onSubmit={(data) => updatePostWithTranslations(postId, data)}
      submitLabel="Sačuvaj izmjene"
      successMessage={() => "Izmjene su sačuvane."}
    />
  );
}
