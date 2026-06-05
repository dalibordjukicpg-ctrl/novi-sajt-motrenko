import { HeroPageClient } from "@/app/admin/(authed)/content/hero/hero-page-client";
import { AdminPageHeader } from "@/components/admin/admin-panel";
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
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader
        title="Hero baner"
        description="Pozadina (slika, video, YouTube), naslovi i tekstovi dugmadi na tri jezika. Desno uživo pregled dok uređujete tekst."
      />
      <HeroPageClient matrix={matrix} globals={globals} media={media} />
    </div>
  );
}
