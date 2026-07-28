import Link from "next/link";
import { notFound } from "next/navigation";

import { EditArticleForm } from "@/components/forms/edit-article-form";
import { adminPath } from "@/lib/admin-base-path";
import type { TeamRole } from "@/lib/db/schema";
import { listMediaOptions } from "@/lib/queries/media-admin";
import {
  getPostForAdminEdit,
  getPostTeamMetaForAdmin,
} from "@/lib/queries/posts";
import { adminTeamGroupForTitle } from "@/lib/team-roster-order";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ postId: string }> };

function teamRoleFromGroup(
  group: ReturnType<typeof adminTeamGroupForTitle>,
): TeamRole | null {
  if (group === "doctors") return "doctor";
  if (group === "embriologists") return "embryologist";
  if (group === "nurses") return "nurse";
  return null;
}

export default async function EditPostPage({ params }: Props) {
  const { postId } = await params;
  const [initial, mediaOptions, meta] = await Promise.all([
    getPostForAdminEdit(postId),
    listMediaOptions(),
    getPostTeamMetaForAdmin(postId),
  ]);
  if (!initial || !meta) notFound();

  const isTeam = meta.contentRole === "team";
  const listHref = isTeam
    ? adminPath("content/team/members")
    : adminPath("posts");
  const listLabel = isTeam ? "← Medicinski tim" : "← Blog — novosti";
  const pageTitle = isTeam ? "Uredi profil tima" : "Uredi članak";

  let initialValues = initial;
  if (isTeam && !initial.teamRole) {
    const inferred = teamRoleFromGroup(
      adminTeamGroupForTitle(initial.me.title),
    );
    initialValues = {
      ...initial,
      teamRole: inferred ?? "doctor",
    };
  }

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-3xl pb-6">
        <Link
          href={listHref}
          className="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          {listLabel}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
          {pageTitle}
        </h1>
      </div>
      <EditArticleForm
        postId={postId}
        initialValues={initialValues}
        mediaOptions={mediaOptions}
        showTeamRole={isTeam}
      />
    </main>
  );
}
