import { TeamHomeMediaEditor } from "@/components/admin/team-home-media-editor";
import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { buildSiteStringMatrix } from "@/lib/admin/build-site-matrix";
import { getSiteGlobalsRow } from "@/lib/queries/site-globals";
import { listMediaOptions } from "@/lib/queries/media-admin";

export const dynamic = "force-dynamic";

export default async function HomeSectionsContentPage() {
  const [matrix, globals, media] = await Promise.all([
    buildSiteStringMatrix(),
    getSiteGlobalsRow(),
    listMediaOptions(),
  ]);

  const teamIds: [
    string | null,
    string | null,
    string | null,
    string | null,
  ] = [
    globals?.teamM1MediaId ?? null,
    globals?.teamM2MediaId ?? null,
    globals?.teamM3MediaId ?? null,
    globals?.teamM4MediaId ?? null,
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <AdminPageHeader
        title="Sekcije početne"
        description="Statistike, naslovi blokova i „Upoznajte tim“ — tekstovi i portreti četiri člana. Raspored na sajtu ostaje iz šablona."
      />

      <AdminPanel title="Statistike i naslovi sekcija">
        <TabbedSiteStringsForm group="sections" matrix={matrix} />
      </AdminPanel>

      <AdminPanel
        title="Blok „Upoznajte tim“"
        description="Naslovi, uvod, ime i uloga za četiri osobe, tri istaknute kartice i tekst linka. Jezik: tabovi u formi."
      >
        <div className="team-admin-strings [&_button[type=submit]]:border-0 [&_button[type=submit]]:bg-[#f37021] [&_button[type=submit]]:hover:bg-[#e0651c] [&_textarea]:border-[#eadfce] [&_textarea]:focus:border-[#f37021] [&_textarea]:focus:ring-[#f37021]/30">
          <TabbedSiteStringsForm
            group="team"
            matrix={matrix}
            className="lg:grid-cols-1"
          />
        </div>
      </AdminPanel>

      <TeamHomeMediaEditor mediaOptions={media} initialIds={teamIds} />
    </div>
  );
}
