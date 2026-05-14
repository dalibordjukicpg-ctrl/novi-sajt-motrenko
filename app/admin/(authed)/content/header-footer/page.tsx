import { saveNavLinkAction } from "@/app/admin/(authed)/site/actions";
import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import { buildSiteStringMatrix } from "@/lib/admin/build-site-matrix";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { loadNavForAdmin } from "@/lib/queries/site";

export const dynamic = "force-dynamic";

export default async function HeaderFooterContentPage() {
  const [matrix, navRows] = await Promise.all([
    buildSiteStringMatrix(),
    loadNavForAdmin(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Header i footer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Brend, kontakt, footer tekstovi i linkovi društvenih mreža — kartice{" "}
          <strong>MNE · EN · RU · TR</strong> unutar jedne forme. Ispod: URL-i i
          nazivi stavki menija.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">
          Tekstovi i kontakt
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Sačuvaj jednom za sve jezike; grla polja sadrže http(s) URL (Facebook,
          Instagram, LinkedIn).
        </p>
        <div className="mt-6">
          <TabbedSiteStringsForm group="headerFooter" matrix={matrix} />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">
          Navigacija (header)
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Linkovi sa <code className="rounded bg-neutral-100 px-1">#</code>{" "}
          vode na odlomak na početnoj. Isto polje URL koristi javni sajt.
        </p>
        <div className="mt-6 space-y-6">
          {navRows.map((r) => (
            <form
              key={r.linkId}
              action={saveNavLinkAction}
              className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-4"
            >
              <input type="hidden" name="linkId" value={r.linkId} />
              <div className="flex flex-wrap items-end gap-4">
                <label className="block min-w-[200px] flex-1 text-sm">
                  <span className="font-medium text-neutral-700">
                    URL / sidro
                  </span>
                  <input
                    name="href"
                    defaultValue={r.href}
                    className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
                  />
                </label>
                <label className="block w-28 text-sm">
                  <span className="font-medium text-neutral-700">Redosled</span>
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={r.sortOrder}
                    className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    name="visible"
                    defaultChecked={r.visible}
                    className="rounded border-neutral-300"
                  />
                  Vidljivo
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                >
                  Sačuvaj stavku
                </button>
              </div>
              {r.parentId && (
                <p className="mt-2 text-xs text-neutral-500">
                  Podstavka (parent u bazi)
                </p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {locales.map((loc) => (
                  <label key={loc} className="block text-sm">
                    <span className="font-medium text-neutral-700">
                      Naziv ({loc})
                    </span>
                    <input
                      name={`label_${r.linkId}_${loc}`}
                      defaultValue={r.labels[loc as Locale]}
                      className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
                    />
                  </label>
                ))}
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
