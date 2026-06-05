import Link from "next/link";

import { HeaderNavManager } from "@/components/admin/header-nav-manager";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { adminPath } from "@/lib/admin-base-path";
import { listSitePagesForAdmin } from "@/lib/queries/site-pages-admin";
import { loadNavForAdmin } from "@/lib/queries/site";

export const dynamic = "force-dynamic";

export default async function HeaderNavAdminPage() {
  const [navRows, pageOptions] = await Promise.all([
    loadNavForAdmin(),
    listSitePagesForAdmin(),
  ]);

  const pageSelect = pageOptions.map((p) => ({
    slug: p.slug,
    titleMe: p.titleMe,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        title="Header navigacija"
        description="Glavne kategorije i podkategorije u gornjem meniju. Redosled mijenjate strelicama; podstavke povežite sa CMS stranicama (/s/slug)."
      >
        <Link
          href="/me"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[#eadfce] bg-white px-4 py-2 text-sm font-medium text-[#5c4f44] hover:bg-[#fff9f5]"
        >
          Pregled sajta
        </Link>
      </AdminPageHeader>

      <AdminPanel
        title="Kako radi meni"
        description="Svaka glavna kategorija može imati podstavke (padajući meni). Na javnom sajtu se automatski dodaju i CMS stranice označene za header — ovo su ručne stavke iznad toga."
      >
        <p className="text-sm text-[#6b5f54]">
          Naslove kolona u mega meniju (npr. „IVF“, „Infertilitet i sterilitet“) mijenjate u{" "}
          <Link
            href={adminPath("content/header-footer")}
            className="font-medium text-[#c55a15] underline"
          >
            Footer i kontakt
          </Link>{" "}
          → Tekstovi i kontakt. Za podnaslov brenda i kontakt podatke koristite istu stranicu.
        </p>
      </AdminPanel>

      <HeaderNavManager rows={navRows} pageOptions={pageSelect} />
    </div>
  );
}
