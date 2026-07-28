import Link from "next/link";

import { AdminPostList } from "@/components/admin/admin-post-list";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { adminPath } from "@/lib/admin-base-path";
import { listPostsForAdmin } from "@/lib/queries/posts";
import { groupAdminTeamPosts } from "@/lib/team-roster-order";

export const dynamic = "force-dynamic";

function AddMemberLink({ role }: { role: "doctor" | "embryologist" | "nurse" }) {
  return (
    <Link
      href={adminPath(`content/team/members/new?role=${role}`)}
      className="rounded-lg bg-[#f37021] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#d95f16]"
    >
      Dodaj novog člana
    </Link>
  );
}

export default async function AdminTeamMembersPage() {
  const rows = await listPostsForAdmin({ contentRole: "team" });
  const { doctors, embriologists, nurses, other } = groupAdminTeamPosts(rows);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <AdminPageHeader
        title="Medicinski tim — profili"
        description="Biografije članova tima na stranici /s/tim. Poredano po ulogama, istim redoslijedom kao na javnom sajtu."
      >
        <Link
          href={adminPath("content/team")}
          className="shrink-0 rounded-lg border border-[#eadfce] bg-white px-4 py-2 text-sm font-medium text-[#4a3f36] hover:bg-[#fff9f5]"
        >
          Početna sekcija tima
        </Link>
      </AdminPageHeader>

      <AdminPanel
        title="Doktori"
        description="Ginekolozi i specijalisti reproduktivne medicine."
        headerAction={<AddMemberLink role="doctor" />}
      >
        <AdminPostList
          rows={doctors}
          emptyMessage="Nema unesenih profila doktora."
        />
      </AdminPanel>

      <AdminPanel
        title="Klinički embriolozi"
        description="Laboratorija i embriologija."
        headerAction={<AddMemberLink role="embryologist" />}
      >
        <AdminPostList
          rows={embriologists}
          emptyMessage="Nema unesenih profila embriologa."
        />
      </AdminPanel>

      <AdminPanel
        title="Medicinske sestre i tehničari"
        description="Sestre, koordinatori i medicinski tehničari."
        headerAction={<AddMemberLink role="nurse" />}
      >
        <AdminPostList
          rows={nurses}
          emptyMessage="Nema unesenih profila sestara."
        />
      </AdminPanel>

      {other.length > 0 ? (
        <AdminPanel
          title="Ostalo"
          description="Profili bez kategorije — otvorite uređivanje i odaberite ulogu."
        >
          <AdminPostList rows={other} emptyMessage="" />
        </AdminPanel>
      ) : null}
    </div>
  );
}
