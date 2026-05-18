import Link from "next/link";

import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { SitePagesAdminTable } from "@/components/admin/site-pages-admin-table";
import { adminPath } from "@/lib/admin-base-path";
import { listSitePagesForAdmin } from "@/lib/queries/site-pages-admin";

export const dynamic = "force-dynamic";

export default async function AdminSitePagesList() {
  const pages = await listSitePagesForAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        title="Stranice (CMS)"
        description="Statičke stranice sajta. Javni URL: /me/s/slug (i ostali jezici)."
      >
        <Link
          href={adminPath("pages/new")}
          className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c]"
        >
          Nova stranica
        </Link>
      </AdminPageHeader>

      <AdminPanel>
        <SitePagesAdminTable pages={pages} />
      </AdminPanel>
    </div>
  );
}