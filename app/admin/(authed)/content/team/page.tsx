import { HomeTeamHighlightsEditor } from "@/components/admin/home-team-highlights-editor";
import { TeamHomeMediaEditor } from "@/components/admin/team-home-media-editor";
import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { buildSiteStringMatrix } from "@/lib/admin/build-site-matrix";
import {
  listHomeTeamHighlightsAdmin,
  resolveLinkedPagesForTeamHighlights,
} from "@/lib/queries/home-team-highlights";
import { getSiteGlobalsRow } from "@/lib/queries/site-globals";
import { listMediaOptions } from "@/lib/queries/media-admin";

export const dynamic = "force-dynamic";

export default async function HomeTeamContentPage() {
  const [matrix, globals, media, teamHighlights] = await Promise.all([
    buildSiteStringMatrix(),
    getSiteGlobalsRow(),
    listMediaOptions(),
    listHomeTeamHighlightsAdmin(),
  ]);
  const linkedPagesByHighlightId =
    await resolveLinkedPagesForTeamHighlights(teamHighlights);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <AdminPageHeader
        title="Blok „Upoznajte tim“"
        description="Sekcija tima na početnoj: tekstovi, kartice desno (link na stranice) i fotografija istaknutog člana."
      />

      <AdminPanel
        title="Blok „Upoznajte tim“ — tekstovi"
        description="Naslov sekcije, uvod, ime i uloga istaknutog člana, kratki bio i dugme „Upoznajte tim“."
      >
        <div className="team-admin-strings [&_button[type=submit]]:border-0 [&_button[type=submit]]:bg-[#f37021] [&_button[type=submit]]:hover:bg-[#e0651c] [&_textarea]:border-[#eadfce] [&_textarea]:focus:border-[#f37021] [&_textarea]:focus:ring-[#f37021]/30">
          <TabbedSiteStringsForm
            group="team"
            matrix={matrix}
            className="lg:grid-cols-1"
          />
        </div>
      </AdminPanel>

      <AdminPanel
        title="Kartice desno (tekst, slike, link)"
        description="Za svaku karticu: kratki tekst na početnoj i pun editor ispod (naslovi, pasusi, slike iz Medija)."
      >
        <HomeTeamHighlightsEditor
          initialItems={teamHighlights}
          linkedPagesByHighlightId={linkedPagesByHighlightId}
          mediaOptions={media}
        />
      </AdminPanel>

      <TeamHomeMediaEditor
        mediaOptions={media}
        initialTeamHeroMediaId={globals?.teamM1MediaId ?? null}
      />
    </div>
  );
}
