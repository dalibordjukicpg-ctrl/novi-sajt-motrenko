import Link from "next/link";

import { CreateArticleForm } from "@/components/forms/create-article-form";
import { adminPath } from "@/lib/admin-base-path";
import { listMediaOptions } from "@/lib/queries/media-admin";

export const dynamic = "force-dynamic";

export default async function AdminNewPostPage() {
  const mediaOptions = await listMediaOptions();

  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-10">
      <div className="mx-auto max-w-3xl pb-6">
        <Link
          href={adminPath()}
          className="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          ← Admin
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
          Novi članak
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Jedan zapis u bazi: zajednički post i sadržaj na crnogorskom (MNE).
        </p>
      </div>
      <CreateArticleForm mediaOptions={mediaOptions} />
    </main>
  );
}
