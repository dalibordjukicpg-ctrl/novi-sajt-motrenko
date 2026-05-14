import { saveSiteGlobalsFormAction } from "@/app/admin/(authed)/content/site-content-actions";
import { listMediaOptions } from "@/lib/queries/media-admin";
import { getSiteGlobalsRow } from "@/lib/queries/site-globals";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [globals, media] = await Promise.all([
    getSiteGlobalsRow(),
    listMediaOptions(),
  ]);

  const resendOk = Boolean(process.env.RESEND_API_KEY?.trim());

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Podešavanja sajta
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Logo, favicon, globalni fragmenti za analitiku (HTML) i stanje email
          API-ja.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Resend
        </h2>
        <p className="mt-2 text-sm text-neutral-800">
          API ključ:{" "}
          <span className="font-medium">
            {resendOk
              ? "Postavljen (RESEND_API_KEY na serveru)"
              : "Nije postavljen"}
          </span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Dodaj <code className="rounded bg-neutral-100 px-1">RESEND_API_KEY</code>{" "}
          u <code className="rounded bg-neutral-100 px-1">.env</code> kada
          povežeš slanje pošte.
        </p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={saveSiteGlobalsFormAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Logo (medij)
            </label>
            <select
              name="logoMediaId"
              defaultValue={globals?.logoMediaId ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
            >
              <option value="">— bez logotipa —</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Favicon (medij)
            </label>
            <select
              name="faviconMediaId"
              defaultValue={globals?.faviconMediaId ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
            >
              <option value="">— podrazumijevani favicon —</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Fragment za <code className="text-xs">&lt;head&gt;</code>{" "}
              (npr. analitika)
            </label>
            <textarea
              name="analyticsHeadHtml"
              rows={6}
              defaultValue={globals?.analyticsHeadHtml ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 font-mono text-xs"
              placeholder="&lt;script&gt;…&lt;/script&gt;"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Fragment pri dnu <code className="text-xs">&lt;body&gt;</code>
            </label>
            <textarea
              name="analyticsBodyHtml"
              rows={4}
              defaultValue={globals?.analyticsBodyHtml ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 font-mono text-xs"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sačuvaj podešavanja
          </button>
        </form>
      </section>
    </div>
  );
}
