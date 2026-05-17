import Link from "next/link";

import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
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
          href="/admin/pages/new"
          className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c]"
        >
          Nova stranica
        </Link>
      </AdminPageHeader>

      <AdminPanel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#f0e6dc] text-xs uppercase tracking-wide text-[#8a7b6e]">
              <tr>
                <th className="px-4 py-3 font-medium">Naslov (ME)</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[#6b5f54]"
                  >
                    Nema stranica. Kreirajte prvu.
                  </td>
                </tr>
              ) : (
                pages.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#f8f0e8] last:border-0 hover:bg-[#fff9f5]/60"
                  >
                    <td className="px-4 py-3 font-medium text-[#2a2118]">
                      {p.titleMe}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#5c4f44]">
                      {p.slug}
                    </td>
                    <td className="px-4 py-3">
                      {p.published ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Objavljeno
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#f0e6dc] px-2.5 py-0.5 text-xs text-[#6b5f54]">
                          Skica
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-3">
                        {p.published ? (
                          <Link
                            href={`/me/s/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-[#c55a15] hover:underline"
                          >
                            Pregled
                          </Link>
                        ) : null}
                        <Link
                          href={`/admin/pages/${p.id}/edit`}
                          className="text-sm font-medium text-[#2a2118] hover:underline"
                        >
                          Uredi
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}
