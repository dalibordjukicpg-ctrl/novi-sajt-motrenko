"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { createTeamMemberWithTranslations } from "@/app/admin/(authed)/content/team/members/new/actions";
import { ArticleEditorForm } from "@/components/forms/article-editor-form";
import { adminPath } from "@/lib/admin-base-path";
import type { TeamRole } from "@/lib/db/schema";
import type { MediaOption } from "@/lib/queries/media-admin";
import { locales } from "@/lib/i18n";
import type { ArticleFormValues } from "@/lib/validations/article";

const defaultLocaleBlock = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  metaTitle: "",
  metaDescription: "",
};

type Props = {
  mediaOptions: MediaOption[];
  initialTeamRole: TeamRole;
};

export function CreateTeamMemberForm({
  mediaOptions,
  initialTeamRole,
}: Props) {
  const router = useRouter();

  const emptyForm = useMemo(
    () =>
      ({
        published: false,
        coverMediaId: "",
        teamRole: initialTeamRole,
        ...Object.fromEntries(
          locales.map((loc) => [loc, { ...defaultLocaleBlock }]),
        ),
      }) as ArticleFormValues,
    [initialTeamRole],
  );

  return (
    <ArticleEditorForm
      key={initialTeamRole}
      mediaOptions={mediaOptions}
      initialValues={emptyForm}
      showTeamRole
      onSubmit={createTeamMemberWithTranslations}
      submitLabel="Snimi profil"
      onSuccessNavigate={(postId) => {
        router.push(adminPath(`posts/${postId}/edit`));
        router.refresh();
      }}
    />
  );
}
