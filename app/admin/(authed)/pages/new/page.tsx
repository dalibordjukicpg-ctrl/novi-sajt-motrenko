import Link from "next/link";

import { SitePageFormClient } from "@/components/admin/site-page-form";
import { adminPath } from "@/lib/admin-base-path";
import { listMediaOptions } from "@/lib/queries/media-admin";
import { listSitePagesForAdmin } from "@/lib/queries/site-pages-admin";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function NewSitePageAdmin({ searchParams }: Props) {
  const [pages, mediaOptions] = await Promise.all([
    listSitePagesForAdmin(),
    listMediaOptions(),
  ]);
  const sp = searchParams ? await searchParams : {};
  const slugError = sp.error === "slug";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href={adminPath("pages")}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Nazad na stranice
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
          Nova stranica
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Jedinstveni slug dijele sve jezike. Naslov i HTML sadržaj po jeziku.
        </p>
        {pages.length > 0 ? (
          <p className="mt-1 text-xs text-neutral-500">
            Postojeći slug-ovi: {pages.map((p) => p.slug).join(", ")}
          </p>
        ) : null}
        {slugError ? (
          <p
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            Ovaj slug već postoji. Izaberite drugi URL (slug) ili uredite postojeću
            stranicu.
          </p>
        ) : null}
      </div>
      <SitePageFormClient mode="create" initialPublished mediaOptions={mediaOptions} />
    </div>
  );
}
