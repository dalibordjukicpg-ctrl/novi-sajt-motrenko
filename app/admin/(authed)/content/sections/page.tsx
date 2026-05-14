import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import { buildSiteStringMatrix } from "@/lib/admin/build-site-matrix";

export const dynamic = "force-dynamic";

export default async function HomeSectionsContentPage() {
  const matrix = await buildSiteStringMatrix();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Sekcije početne
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Statistike (4 bloka), naslovi za usluge / priču / novosti. Bento i
          raspored blokova na frontendu ostaju iz šablona; ovdje se uređuje
          copy.
        </p>
      </div>
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <TabbedSiteStringsForm group="sections" matrix={matrix} />
      </section>
    </div>
  );
}
