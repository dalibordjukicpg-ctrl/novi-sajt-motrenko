import Link from "next/link";
import { notFound } from "next/navigation";

import { EditArticleForm } from "@/components/forms/edit-article-form";
import { listMediaOptions } from "@/lib/queries/media-admin";
import { getPostForAdminEdit } from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ postId: string }> };

export default async function EditPostPage({ params }: Props) {
  const { postId } = await params;
  const [initial, mediaOptions] = await Promise.all([
    getPostForAdminEdit(postId),
    listMediaOptions(),
  ]);
  if (!initial) notFound();

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-3xl pb-6">
        <Link
          href="/admin/posts"
          className="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          ← Članci
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
          Uredi članak
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
