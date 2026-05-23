import Link from "next/link";

import { createNavLinkAction } from "@/app/admin/(authed)/site/actions";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { NavLinkRowForm } from "@/components/admin/nav-link-row-form";
import { SocialLinksEditor } from "@/components/admin/social-links-editor";
import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import { adminPath } from "@/lib/admin-base-path";
import { buildSiteStringMatrix } from "@/lib/admin/build-site-matrix";
import { listSitePagesForAdmin } from "@/lib/queries/site-pages-admin";
import { loadNavForAdmin } from "@/lib/queries/site";

export const dynamic = "force-dynamic";

export default async function HeaderFooterContentPage() {
  const [matrix, navRows, pageOptions] = await Promise.all([
    buildSiteStringMatrix(),
    loadNavForAdmin(),
    listSitePagesForAdmin(),
  ]);

  const pageSelect = pageOptions.map((p) => ({
    slug: p.slug,
    titleMe: p.titleMe,
  }));

  const footerRows = navRows.filter((r) => r.placement === "footer");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader
        title="Footer i kontakt"
        description="Brend, kontakt podaci, tekstovi u podnožju i linkovi u kolonama. Za gornji meni koristite Header."
      >
        <Link
          href={adminPath("content/header")}
          className="rounded-lg border border-[#eadfce] bg-white px-4 py-2 text-sm font-medium text-[#5c4f44] hover:bg-[#fff9f5]"
        >
          Header navigacija
        </Link>
      </AdminPageHeader>

      <AdminPanel
        title="Društvene mreže (footer)"
        description="Facebook, Instagram, YouTube, LinkedIn. Prazno polje = mreža se ne prikazuje (npr. uklonite LinkedIn brisanjem URL-a)."
      >
        <SocialLinksEditor matrix={matrix} />
      </AdminPanel>

      <AdminPanel title="Tekstovi i kontakt">
        <TabbedSiteStringsForm group="headerFooter" matrix={matrix} />
      </AdminPanel>

      <AdminPanel
        title="Navigacija — footer (kolone)"
        description="Broj kolone (1–4) grupiše linkove. Preporuka: kolona 1 „O nama”, 2 „Usluge” itd."
      >
        <div className="space-y-6">
          {footerRows.length === 0 ? (
            <p className="text-sm text-[#6b5f54]">
              Još nema footer stavki. Dodajte prvu ispod.
            </p>
          ) : (
            footerRows.map((r) => (
              <NavLinkRowForm
                key={r.linkId}
                href={r.href}
                linkId={r.linkId}
                sortOrder={r.sortOrder}
                visible={r.visible}
                placement="footer"
                footerColumn={r.footerColumn}
                labels={r.labels}
                pageOptions={pageSelect}
              />
            ))
          )}
        </div>

        <form
          action={createNavLinkAction}
          className="mt-8 rounded-xl border border-dashed border-[#e8d9ca] bg-[#fff9f5]/80 p-4"
        >
          <input type="hidden" name="returnTo" value={adminPath("content/header-footer")} />
          <input type="hidden" name="placement" value="footer" />
          <p className="text-sm font-medium text-[#3d342c]">Nova stavka (footer)</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-[#6b5f54]">Kolona</span>
              <select
                name="footerColumn"
                className="mt-1 rounded-lg border border-[#eadfce] bg-white px-3 py-2"
                defaultValue="1"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-[#6b5f54]">URL</span>
              <input
                name="href"
                defaultValue="/s/"
                className="mt-1 min-w-[180px] rounded-lg border border-[#eadfce] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-[#6b5f54]">Redosled</span>
              <input
                name="sortOrder"
                type="number"
                defaultValue={footerRows.length + 1}
                className="mt-1 w-24 rounded-lg border border-[#eadfce] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-[#6b5f54]">Naziv</span>
              <input
                name="defaultLabel"
                defaultValue="Link"
                className="mt-1 rounded-lg border border-[#eadfce] bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c]"
            >
              Dodaj footer link
            </button>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}
