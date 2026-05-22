import Link from "next/link";
import { notFound } from "next/navigation";

import { EditArticleForm } from "@/components/forms/edit-article-form";
import { adminPath } from "@/lib/admin-base-path";
import { listMediaOptions } from "@/lib/queries/media-admin";
import {
  getPostContentRoleForAdmin,
  getPostForAdminEdit,
} from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ postId: string }> };

export default async function EditPostPage({ params }: Props) {
  const { postId } = await params;
  const [initial, mediaOptions, contentRole] = await Promise.all([
    getPostForAdminEdit(postId),
    listMediaOptions(),
    getPostContentRoleForAdmin(postId),
  ]);
  if (!initial) notFound();

  const isTeam = contentRole === "team";
  const listHref = isTeam
    ? adminPath("content/team/members")
    : adminPath("posts");
  const listLabel = isTeam ? "← Medicinski tim" : "← Blog — novosti";
  const pageTitle = isTeam ? "Uredi profil tima" : "Uredi članak";

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
        initialValues={initial}
        mediaOptions={mediaOptions}
      />
    </main>
  );
}
