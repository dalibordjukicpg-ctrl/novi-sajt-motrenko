import Link from "next/link";

import { AdminPostList } from "@/components/admin/admin-post-list";
import { AdminPageHeader } from "@/components/admin/admin-panel";
import { adminPath } from "@/lib/admin-base-path";
import { listPostsForAdmin } from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const rows = await listPostsForAdmin({ contentRole: "blog" });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <AdminPageHeader
        title="Blog — novosti"
        description="Novosti iz centra i nauke. Samo blog članci — profili tima su u sekciji Medicinski tim."
      >
        <Link
          href={adminPath("posts/new")}
          className="rounded-lg bg-[#2a2118] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d342c]"
        >
          Novi članak
        </Link>
      </AdminPageHeader>

      <AdminPostList
        rows={rows}
        emptyMessage="Još nema blog članaka."
      />
    </div>
  );
}
