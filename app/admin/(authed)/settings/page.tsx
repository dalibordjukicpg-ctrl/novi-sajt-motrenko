import { cleanWpNNoiseFormAction, saveSiteGlobalsFormAction } from "@/app/admin/(authed)/content/site-content-actions";
import { SettingsLogoBrandingFields } from "@/components/admin/settings-logo-branding";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { listMediaOptions } from "@/lib/queries/media-admin";
import { getSiteGlobalsRow } from "@/lib/queries/site-globals";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ nClean?: string; nCleanError?: string }>;
};

export default async function AdminSettingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const nCleanCount = sp.nClean ? Number.parseInt(sp.nClean, 10) : null;
  const nCleanFailed = sp.nCleanError === "1";

  const session = await getSession();
  const canEditAnalytics = session
    ? hasPermission(session.role, PERMISSIONS.INTEGRATIONS_MANAGE)
    : false;
  const canCleanContent = session
    ? hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)
    : false;

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
          Održavanje javnog sajta, logo, favicon, analitika (HTML) i stanje
          e-mail API-ja.
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

      {nCleanCount != null && Number.isFinite(nCleanCount) ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Uklonjeni WP artefakti („n“, „nnn“) iz {nCleanCount}{" "}
          {nCleanCount === 1 ? "reda" : "redova"} u bazi.
        </div>
      ) : null}
      {nCleanFailed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Čišćenje n-artefakata nije uspjelo. Provjerite log servera.
        </div>
      ) : null}

      {canCleanContent ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            CMS održavanje
          </h2>
          <p className="mt-2 text-sm text-neutral-700">
            Uklanja WordPress uvoz artefakte — usamljena slova{" "}
            <code className="rounded bg-neutral-100 px-1">n</code>,{" "}
            <code className="rounded bg-neutral-100 px-1">nnn</code> i slično — iz
            objava, stranica, tekstova sajta, kartica i meta polja u bazi.
          </p>
          <form action={cleanWpNNoiseFormAction} className="mt-4">
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Očisti „nnn“ artefakte u bazi
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={saveSiteGlobalsFormAction} className="space-y-8">
          <SettingsLogoBrandingFields
            media={media}
            initialLogoMediaId={globals?.logoMediaId ?? null}
            initialFaviconMediaId={globals?.faviconMediaId ?? null}
          />

          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
              Režim održavanja (javni sajt)
            </h2>
            <p className="mt-2 text-sm text-amber-950/90">
              Kada je uključeno, posjetioci na{" "}
              <code className="rounded bg-white/90 px-1">/me</code> vide samo
              logo i poruku.{" "}
              <code className="rounded bg-white/90 px-1">/admin</code> i API-i
              rade normalno. Javne IP adrese u listi ispod i dalje vide pun sajt
              (npr. vaša kućna ili kancelarijska adresa).
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="maintenance_enabled_cb"
                  name="maintenanceEnabled"
                  value="1"
                  defaultChecked={Boolean(globals?.maintenanceEnabled)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-amber-800/30 text-amber-900"
                />
                <input type="hidden" name="maintenanceEnabled" value="0" />
                <label
                  htmlFor="maintenance_enabled_cb"
                  className="cursor-pointer text-sm font-medium text-amber-950"
                >
                  Prikaži stranicu „U održavanju” umjesto prezentacije
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-950">
                  Naslov
                </label>
                <input
                  name="maintenanceTitle"
                  type="text"
                  defaultValue={globals?.maintenanceTitle ?? ""}
                  placeholder="npr. Radimo na poboljšanju sajta"
                  className="mt-1 w-full rounded-md border border-amber-200/90 bg-white px-3 py-2 text-sm"
                  maxLength={255}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-950">
                  Poruka za posjetioce
                </label>
                <textarea
                  name="maintenanceMessage"
                  rows={4}
                  defaultValue={globals?.maintenanceMessage ?? ""}
                  placeholder="npr. Trenutno renoviramo sajt. Uskoro se vraćamo — hvala na strpljenju."
                  className="mt-1 w-full rounded-md border border-amber-200/90 bg-white px-3 py-2 text-sm"
                  maxLength={8000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-950">
                  Logo na ekranu održavanja (opcionalno)
                </label>
                <select
                  name="maintenanceLogoMediaId"
                  defaultValue={globals?.maintenanceLogoMediaId ?? ""}
                  className="mt-1 w-full rounded-md border border-amber-200/90 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— koristi glavni logo sajta —</option>
                  {media.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-950">
                  IP adrese koje preskaču održavanje
                </label>
                <textarea
                  name="maintenanceBypassIps"
                  rows={4}
                  defaultValue={globals?.maintenanceBypassIps ?? ""}
                  placeholder={"npr.\n203.0.113.10\n198.51.100.2"}
                  className="mt-1 w-full rounded-md border border-amber-200/90 bg-white px-3 py-2 font-mono text-xs"
                  maxLength={8000}
                />
                <p className="mt-1 text-xs text-amber-900/80">
                  Jedan IP po redu ili odvojeni zarezom. Na produkciji uz
                  reverse proxy prosljeđuje se obično prvi hop u zaglavlju{" "}
                  <code className="rounded bg-white/90 px-0.5">X-Forwarded-For</code>
                  ; ako ne vidite svoj IP, provjerite šta server stvarno prima.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Fragment za <code className="text-xs">&lt;head&gt;</code>{" "}
              (npr. analitika)
            </label>
            <textarea
              name="analyticsHeadHtml"
              rows={6}
              readOnly={!canEditAnalytics}
              defaultValue={globals?.analyticsHeadHtml ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 font-mono text-xs disabled:bg-neutral-100"
              placeholder="&lt;script&gt;…&lt;/script&gt;"
            />
            {!canEditAnalytics ? (
              <p className="mt-1 text-xs text-amber-800">
                Samo SUPER_ADMIN može uređivati skripte u head/body.
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Fragment pri dnu <code className="text-xs">&lt;body&gt;</code>
            </label>
            <textarea
              name="analyticsBodyHtml"
              rows={4}
              readOnly={!canEditAnalytics}
              defaultValue={globals?.analyticsBodyHtml ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 font-mono text-xs disabled:bg-neutral-100"
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
