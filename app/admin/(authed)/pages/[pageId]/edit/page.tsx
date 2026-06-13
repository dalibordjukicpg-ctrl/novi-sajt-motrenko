import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSitePageAction } from "@/app/admin/(authed)/pages/actions";
import { SitePageFormClient } from "@/components/admin/site-page-form";
import { adminPath } from "@/lib/admin-base-path";
import { listMediaOptions } from "@/lib/queries/media-admin";
import { getSitePageForAdmin } from "@/lib/queries/site-pages-admin";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ pageId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function EditSitePageAdmin({ params, searchParams }: Props) {
  const { pageId } = await params;
  const [page, mediaOptions] = await Promise.all([
    getSitePageForAdmin(pageId),
    listMediaOptions(),
  ]);
  if (!page) notFound();
  const sp = searchParams ? await searchParams : {};
  const slugError = sp.error === "slug";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={adminPath("pages")}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Lista stranica
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
            Uredi stranicu
          </h1>
          <p className="mt-2 font-mono text-sm text-neutral-600">{page.slug}</p>
          {slugError ? (
            <p
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              Ovaj slug već koristi druga stranica. Unesite jedinstven slug.
            </p>
          ) : null}
        </div>
        <form action={deleteSitePageAction}>
          <input type="hidden" name="pageId" value={page.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 hover:bg-red-100"
          >
            Obriši stranicu
          </button>
        </form>
      </div>
      <SitePageFormClient
        mode="edit"
        pageId={page.id}
        initialSlug={page.slug}
        initialPublished={page.published}
        initialUnlisted={page.unlisted}
        initialQuestionnaireEmbedUrl={page.questionnaireEmbedUrl}
        initialHeaderNavGroup={page.headerNavGroup}
        byLocale={page.byLocale}
        mediaOptions={mediaOptions}
      />
    </div>
  );
}
