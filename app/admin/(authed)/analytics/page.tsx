import Link from "next/link";

import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import {
  getAnalyticsSummary,
  getBrowserBreakdown,
  getDeviceBreakdown,
  getOsBreakdown,
  getTopCountries,
  getTopPaths,
  getTopReferrers,
  getVisitsByHourOfDay,
  getVisitsByLocale,
  getVisitsByMonth,
  type AnalyticsRange,
} from "@/lib/queries/analytics-admin";
import { redirect, unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ days?: string; bots?: string }>;
};

function parseDays(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return 90;
  return Math.min(Math.max(n, 7), 730);
}

function formatRangeLabel(range: AnalyticsRange): string {
  try {
    const a = new Intl.DateTimeFormat("sr-Latn-ME", {
      dateStyle: "medium",
    }).format(range.from);
    const b = new Intl.DateTimeFormat("sr-Latn-ME", {
      dateStyle: "medium",
    }).format(range.to);
    return `${a} — ${b}`;
  } catch {
    return "";
  }
}

function formatYm(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  const d = new Date(Number(y), Number(m) - 1, 1);
  try {
    return new Intl.DateTimeFormat("sr-Latn-ME", {
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return ym;
  }
}

function regionLabel(code: string): string {
  if (code === "??") return "Nepoznato / lokalno";
  try {
    return (
      new Intl.DisplayNames(["sr-Latn"], { type: "region" }).of(code) ??
      code
    );
  } catch {
    return code;
  }
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-3 text-xs text-[#4a3f36]">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#f0e6dc]">
        <div
          className="h-full rounded-full bg-[#c55a15]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function isMissingAnalyticsTable(e: unknown): boolean {
  const err = e as { code?: string; errno?: number; message?: string };
  return (
    err.code === "ER_NO_SUCH_TABLE" ||
    err.errno === 1146 ||
    Boolean(
      err.message &&
        /Table ['"].*analytics_visits['"] doesn't exist/i.test(err.message),
    )
  );
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.ANALYTICS_VIEW)) {
    unauthorized();
  }

  const sp = (await searchParams) ?? {};
  const days = parseDays(sp.days);
  const includeBots = sp.bots === "1";

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const range: AnalyticsRange = { from, to };

  let summary: Awaited<ReturnType<typeof getAnalyticsSummary>>;
  let byMonth: Awaited<ReturnType<typeof getVisitsByMonth>>;
  let countries: Awaited<ReturnType<typeof getTopCountries>>;
  let paths: Awaited<ReturnType<typeof getTopPaths>>;
  let referrers: Awaited<ReturnType<typeof getTopReferrers>>;
  let devices: Awaited<ReturnType<typeof getDeviceBreakdown>>;
  let browsers: Awaited<ReturnType<typeof getBrowserBreakdown>>;
  let oss: Awaited<ReturnType<typeof getOsBreakdown>>;
  let hours: Awaited<ReturnType<typeof getVisitsByHourOfDay>>;
  let locales: Awaited<ReturnType<typeof getVisitsByLocale>>;

  try {
    [
      summary,
      byMonth,
      countries,
      paths,
      referrers,
      devices,
      browsers,
      oss,
      hours,
      locales,
    ] = await Promise.all([
      getAnalyticsSummary(range, includeBots),
      getVisitsByMonth(range, includeBots),
      getTopCountries(range, includeBots, 18),
      getTopPaths(range, includeBots, 22),
      getTopReferrers(range, includeBots, 18),
      getDeviceBreakdown(range, includeBots),
      getBrowserBreakdown(range, includeBots, 12),
      getOsBreakdown(range, includeBots, 12),
      getVisitsByHourOfDay(range, includeBots),
      getVisitsByLocale(range, includeBots),
    ]);
  } catch (e) {
    console.error("[admin analytics]", e);
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-12">
        <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
          Analitika
        </h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          {isMissingAnalyticsTable(e) ? (
            <>
              <p className="font-medium">Tabela za analitiku još nije u bazi.</p>
              <p className="mt-2 text-amber-900/90">
                U korijenu projekta pokreni migracije, zatim osvježi ovu stranicu:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-white/80 p-3 text-xs">
                npm run db:migrate
              </pre>
              <p className="mt-3 text-xs text-amber-900/80">
                (SQL fajl{" "}
                <code className="rounded bg-white/90 px-1">
                  drizzle/0014_analytics_visits.sql
                </code>
                )
              </p>
            </>
          ) : (
            <p>
              Ne mogu učitati analitiku (provjeri terminal / log servera). Ako je
              u pitanju MySQL, provjeri i{" "}
              <code className="rounded bg-white/80 px-1">DATABASE_URL</code>.
            </p>
          )}
        </div>
      </div>
    );
  }

  const maxMonth = Math.max(1, ...byMonth.map((r) => r.visits));
  const maxHour = Math.max(1, ...hours.map((h) => h.visits));

  const baseQs = new URLSearchParams();
  baseQs.set("days", String(days));
  if (includeBots) baseQs.set("bots", "1");

  function hrefWith(partial: Record<string, string | undefined>) {
    const q = new URLSearchParams(baseQs.toString());
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined) q.delete(k);
      else q.set(k, v);
    }
    return `${adminPath("analytics")}?${q.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
            Analitika posjeta
          </h1>
          <p className="mt-1 text-sm text-[#6b5f54]">
            Interno praćenje prometa na javnom dijelu sajta (bez trećih strana).
            Lokacija je procjena po IP adresi (GeoIP). Jedinstveni posjetioci su
            aproksimacija (hash IP + preglednika).
          </p>
          <p className="mt-2 text-xs text-[#8a7b6e]">{formatRangeLabel(range)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([30, 90, 180, 365] as const).map((d) => (
            <Link
              key={d}
              href={hrefWith({ days: String(d), bots: includeBots ? "1" : undefined })}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                days === d
                  ? "bg-[#2a2118] text-white"
                  : "border border-[#e8ddd4] bg-white text-[#6b5f54] hover:bg-[#fff9f5]"
              }`}
            >
              {d} d
            </Link>
          ))}
          <Link
            href={hrefWith({ bots: includeBots ? undefined : "1" })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              includeBots
                ? "bg-amber-700 text-white"
                : "border border-[#e8ddd4] bg-white text-[#6b5f54] hover:bg-[#fff9f5]"
            }`}
          >
            {includeBots ? "Uključeni roboti" : "Samo ljudi"}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a7b6e]">
            Pregledi (čovjek)
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[#2a2118]">
            {summary.visits}
          </p>
          {!includeBots ? (
            <p className="mt-2 text-xs text-[#8a7b6e]">
              + roboti: {summary.botVisits}{" "}
              <Link href={hrefWith({ bots: "1" })} className="underline">
                prikaži
              </Link>
            </p>
          ) : (
            <p className="mt-2 text-xs text-[#8a7b6e]">
              Uključeni roboti i indeksatori.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a7b6e]">
            Procjena jedinstvenih
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[#2a2118]">
            {summary.approximateUniqueVisitors}
          </p>
          <p className="mt-2 text-xs text-[#8a7b6e]">
            Distinktna vrijednost hasha posjetioca u periodu.
          </p>
        </div>
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a7b6e]">
            Roboti (ukupno u periodu)
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[#2a2118]">
            {summary.botVisits}
          </p>
          <p className="mt-2 text-xs text-[#8a7b6e]">
            Detekcija poznatih user-agent stringova.
          </p>
        </div>
      </div>

      {summary.visits === 0 && summary.botVisits === 0 ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-950">
          <p className="font-medium text-sky-900">Još nema pogodaka u bazi za ovaj period.</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sky-900/90">
            <li>
              Otvori početnicu ili neku stranicu na <strong>javnom</strong> dijelu
              (npr. <code className="rounded bg-white/90 px-1">/me</code>), pa osvježi
              analitiku.
            </li>
            <li>
              Ako si tek dodao modul:{" "}
              <code className="rounded bg-white/90 px-1">npm run db:migrate</code>.
            </li>
            <li>
              U dev alatima (F12 → Network) traži zahtjev{" "}
              <code className="rounded bg-white/90 px-1">collect</code> — očekuj status{" "}
              <strong>200</strong>.
            </li>
          </ul>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Po mjesecima
          </h2>
          <p className="mt-1 text-xs text-[#8a7b6e]">
            Ukupno pregleda i procjena jedinstvenih po mjesecu.
          </p>
          <div className="mt-5 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {byMonth.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Još nema podataka.</p>
            ) : (
              byMonth.map((row) => (
                <div key={row.ym} className="space-y-1">
                  <BarRow
                    label={formatYm(row.ym)}
                    value={row.visits}
                    max={maxMonth}
                  />
                  <p className="text-[11px] text-[#8a7b6e]">
                    jedinstveno ~{row.visitors}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Po satu dana (UTC na serveru)
          </h2>
          <p className="mt-1 text-xs text-[#8a7b6e]">
            Raspodjela u izabranom periodu; podešite server na lokalnu zonu za
            produkciju.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {hours.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : (
              hours.map((h) => (
                <div
                  key={h.hour}
                  className="flex flex-col items-center gap-1 text-[10px] text-[#6b5f54]"
                >
                  <div
                    className="w-5 rounded-t bg-[#c55a15]/80"
                    style={{
                      height: `${Math.max(4, (h.visits / maxHour) * 72)}px`,
                    }}
                    title={`${h.hour}h — ${h.visits}`}
                  />
                  <span>{h.hour}h</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Lokacije (država)
          </h2>
          <div className="mt-4 space-y-3">
            {countries.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : (
              (() => {
                const m = Math.max(1, ...countries.map((c) => c.visits));
                return countries.map((c) => (
                  <BarRow
                    key={c.code}
                    label={`${regionLabel(c.code)} (${c.code})`}
                    value={c.visits}
                    max={m}
                  />
                ));
              })()
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Jezik putanje
          </h2>
          <div className="mt-4 space-y-3">
            {locales.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : (
              (() => {
                const m = Math.max(1, ...locales.map((l) => l.visits));
                return locales.map((l) => (
                  <BarRow key={l.locale} label={l.locale} value={l.visits} max={m} />
                ));
              })()
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Najčešće stranice
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#8a7b6e]">
                <tr>
                  <th className="py-2 pr-3">Putanja</th>
                  <th className="py-2 text-right">Pregleda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5ebe4] text-[#2a2118]">
                {paths.map((p) => (
                  <tr key={p.path}>
                    <td className="max-w-[28rem] py-2 pr-3 font-mono text-[11px] break-all">
                      {p.path}
                    </td>
                    <td className="py-2 text-right tabular-nums">{p.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paths.length === 0 ? (
              <p className="mt-3 text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Izvori saobraćaja
          </h2>
          <p className="mt-1 text-xs text-[#8a7b6e]">
            Host iz HTTP referrer zaglavlja (prvi ulaz često nema referrer).
          </p>
          <div className="mt-4 space-y-3">
            {referrers.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : (
              (() => {
                const m = Math.max(1, ...referrers.map((r) => r.visits));
                return referrers.map((r, i) => (
                  <BarRow
                    key={`${r.host}:${i}`}
                    label={r.host}
                    value={r.visits}
                    max={m}
                  />
                ));
              })()
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Uređaji
          </h2>
          <div className="mt-4 space-y-3">
            {devices.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : (
              (() => {
                const m = Math.max(1, ...devices.map((d) => d.visits));
                return devices.map((d) => (
                  <BarRow
                    key={d.deviceType}
                    label={d.deviceType}
                    value={d.visits}
                    max={m}
                  />
                ));
              })()
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Preglednici
          </h2>
          <div className="mt-4 space-y-3">
            {browsers.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : (
              (() => {
                const m = Math.max(1, ...browsers.map((b) => b.visits));
                return browsers.map((b, i) => (
                  <BarRow
                    key={`${b.browser}:${i}`}
                    label={b.browser}
                    value={b.visits}
                    max={m}
                  />
                ));
              })()
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[#f0e6dc] bg-white/95 p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#2a2118]">
            Operativni sistemi
          </h2>
          <div className="mt-4 space-y-3">
            {oss.length === 0 ? (
              <p className="text-sm text-[#8a7b6e]">Nema podataka.</p>
            ) : (
              (() => {
                const m = Math.max(1, ...oss.map((o) => o.visits));
                return oss.map((o, i) => (
                  <BarRow
                    key={`${o.os}:${i}`}
                    label={o.os}
                    value={o.visits}
                    max={m}
                  />
                ));
              })()
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-[#8a7b6e]">
        Skripte trećih strana (npr. GA) i dalje možete ubaciti u &quot;Sajt i
        skripte&quot; ako vam treba dodatna dubina — ovi podaci ostaju u vašoj
        bazi.
      </p>
    </div>
  );
}
