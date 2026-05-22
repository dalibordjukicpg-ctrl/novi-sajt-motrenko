import Link from "next/link";

import { AdminPostList } from "@/components/admin/admin-post-list";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { adminPath } from "@/lib/admin-base-path";
import { listPostsForAdmin } from "@/lib/queries/posts";
import { groupAdminTeamPosts } from "@/lib/team-roster-order";

export const dynamic = "force-dynamic";

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
      >
        <AdminPostList
          rows={doctors}
          emptyMessage="Nema unesenih profila doktora."
        />
      </AdminPanel>

      <AdminPanel
        title="Klinički embriolozi"
        description="Laboratorija i embriologija."
      >
        <AdminPostList
          rows={embriologists}
          emptyMessage="Nema unesenih profila embriologa."
        />
      </AdminPanel>

      <AdminPanel
        title="Medicinske sestre i tehničari"
        description="Sestre, koordinatori i medicinski tehničari."
      >
        <AdminPostList
          rows={nurses}
          emptyMessage="Nema unesenih profila sestara."
        />
      </AdminPanel>

      {other.length > 0 ? (
        <AdminPanel
          title="Ostalo"
          description="Profili koji nisu automatski razvrstani — provjerite naslov (me)."
        >
          <AdminPostList rows={other} emptyMessage="" />
        </AdminPanel>
      ) : null}
    </div>
  );
}
