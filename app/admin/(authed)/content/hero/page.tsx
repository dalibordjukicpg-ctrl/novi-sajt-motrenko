import { HeroPageClient } from "@/app/admin/(authed)/content/hero/hero-page-client";
import { buildSiteStringMatrix } from "@/lib/admin/build-site-matrix";
import { listMediaOptions } from "@/lib/queries/media-admin";
import { getSiteGlobalsRow } from "@/lib/queries/site-globals";

export const dynamic = "force-dynamic";

export default async function HeroContentPage() {
  const [matrix, globals, media] = await Promise.all([
    buildSiteStringMatrix(),
    getSiteGlobalsRow(),
    listMediaOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Hero / baner
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Naslovi, podnaslov i tekstovi dugmadi na jezicima; desno uživo pregled
          uz odabranu pozadinsku sliku.
        </p>
      </div>
      <HeroPageClient matrix={matrix} globals={globals} media={media} />
    </div>
  );
}
