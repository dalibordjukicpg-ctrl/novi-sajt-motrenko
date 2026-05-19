import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { buildSiteStringMatrix } from "@/lib/admin/build-site-matrix";

export const dynamic = "force-dynamic";

export default async function HomeSectionsContentPage() {
  const matrix = await buildSiteStringMatrix();

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <AdminPageHeader
        title="Sekcije početne"
        description="Statistike i naslovi ostalih blokova na početnoj (usluge, novosti, CTA). Blok tima: lijevi meni → „Upoznajte tim“."
      />

      <AdminPanel title="Statistike i naslovi sekcija">
        <TabbedSiteStringsForm group="sections" matrix={matrix} />
      </AdminPanel>
    </div>
  );
}
