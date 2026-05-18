import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { listAppointmentRequestsForAdmin } from "@/lib/queries/booking-requests-admin";
import { redirect, unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

function formatTs(d: Date) {
  try {
    return new Intl.DateTimeFormat("sr-Latn-ME", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function clip(s: string | null | undefined, n: number) {
  if (!s) return "—";
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

export default async function AdminBookingsPage() {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.BOOKING_REQUESTS_VIEW)) {
    unauthorized();
  }

  const rows = await listAppointmentRequestsForAdmin(200);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
          Zahtjevi za termin
        </h1>
        <p className="mt-1 text-sm text-[#6b5f54]">
          Podaci sa prijavnice na početnoj. Može uključivati zdravstvene
          napomene — tretirajte kao osetljive podatke.
        </p>
        <p className="mt-3 rounded-lg border border-[#e8ddd4] bg-[#fffbf7] px-4 py-3 text-sm text-[#5c4f43]">
          <span className="font-medium text-[#2a2118]">Email:</span> puni sadržaj
          zahtjeva i dalje se šalje na adresu iz{" "}
          <code className="rounded bg-white px-1 text-xs">BOOKING_NOTIFY_EMAIL</code>{" "}
          ili <code className="rounded bg-white px-1 text-xs">contact.email</code>{" "}
          (CMS, locale me) ako env nije postavljen. Ovdje je samo kronološki pregled
          zapisanih prijava (najnovije prvo).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#f0e6dc] bg-white text-sm">
        <table className="min-w-full divide-y divide-[#f0e6dc] text-left">
          <thead className="bg-[#fff9f5] text-xs uppercase text-[#8a7b6e]">
            <tr>
              <th className="px-3 py-2">Vrijeme</th>
              <th className="px-3 py-2">Jezik</th>
              <th className="px-3 py-2">Ime</th>
              <th className="px-3 py-2">Kontakt</th>
              <th className="px-3 py-2">Ko dolazi</th>
              <th className="px-3 py-2 min-w-[12rem]">Šta vas je dovelo</th>
              <th className="px-3 py-2">TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e6dc]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-[#8a7b6e]"
                >
                  Još nema zahtjeva.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="align-top text-[#2a2118]">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-[#6b5f54]">
                    {formatTs(r.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-xs uppercase text-[#6b5f54]">
                    {r.locale}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.fullName}</div>
                    <div className="text-xs text-[#6b5f54]">
                      {r.dateOfBirth
                        ? `rođ. ${r.dateOfBirth}`
                        : "datum rođ. nije naveden"}
                    </div>
                    {(r.partnerFullName || r.partnerPhone) && (
                      <div className="mt-1 text-xs text-[#6b5f54]">
                        partner:{" "}
                        {[r.partnerFullName, r.partnerPhone]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-xs break-all">
                    <div>
                      <a
                        className="text-[#c55a15] underline-offset-2 hover:underline"
                        href={`mailto:${encodeURIComponent(r.email)}`}
                      >
                        {r.email}
                      </a>
                    </div>
                    <div className="mt-1">
                      <a
                        className="text-[#c55a15] underline-offset-2 hover:underline"
                        href={`tel:${r.phone.replace(/\s/g, "")}`}
                      >
                        {r.phone}
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-[11px] text-[#6b5f54]">
                    {r.whoAttends ?? "—"}
                  </td>
                  <td className="max-w-md px-3 py-2 text-xs">
                    <p className="whitespace-pre-wrap text-[#2a2118]">
                      {clip(r.whatBroughtYou, 480)}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-[#6b5f54]">
                    {r.tryingConceiveDuration ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
