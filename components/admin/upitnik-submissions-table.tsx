import { Download, MailCheck, MailX } from "lucide-react";

import type { listQuestionnaireSubmissionsForAdmin } from "@/lib/queries/questionnaire-submissions-admin";

type Row = Awaited<ReturnType<typeof listQuestionnaireSubmissionsForAdmin>>[number];

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

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function EmailFlag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        ok
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80"
      }`}
      title={label}
    >
      {ok ? <MailCheck size={11} /> : <MailX size={11} />}
      {label}
    </span>
  );
}

type Props = {
  rows: Row[];
};

export function UpitnikSubmissionsTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#f0e6dc] bg-white text-sm">
      <table className="min-w-full divide-y divide-[#f0e6dc] text-left">
        <thead className="bg-[#fff9f5] text-xs uppercase text-[#8a7b6e]">
          <tr>
            <th className="px-3 py-2">Vrijeme</th>
            <th className="px-3 py-2">Jezik</th>
            <th className="px-3 py-2">Pacijent</th>
            <th className="px-3 py-2">Kontakt</th>
            <th className="px-3 py-2">Email status</th>
            <th className="px-3 py-2">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e6dc]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-[#8a7b6e]">
                Još nema poslanih upitnika. Kada pacijent pošalje formu, ovdje će se
                pojaviti zapis sa PDF arhivom.
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
                  <div className="font-medium">{r.femaleName}</div>
                  {r.maleName && (
                    <div className="mt-1 text-xs text-[#6b5f54]">
                      partner: {r.maleName}
                    </div>
                  )}
                </td>
                <td className="max-w-[14rem] px-3 py-2 text-xs break-all">
                  <div>
                    <a
                      className="text-[#c55a15] underline-offset-2 hover:underline"
                      href={`mailto:${encodeURIComponent(r.femaleEmail)}`}
                    >
                      {r.femaleEmail}
                    </a>
                  </div>
                  {r.maleEmail && (
                    <div className="mt-1">
                      <a
                        className="text-[#c55a15] underline-offset-2 hover:underline"
                        href={`mailto:${encodeURIComponent(r.maleEmail)}`}
                      >
                        {r.maleEmail}
                      </a>
                    </div>
                  )}
                  {r.phone && (
                    <div className="mt-1">
                      <a
                        className="text-[#c55a15] underline-offset-2 hover:underline"
                        href={`tel:${r.phone.replace(/\s/g, "")}`}
                      >
                        {r.phone}
                      </a>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex max-w-[11rem] flex-wrap gap-1">
                    <EmailFlag ok={r.staffEmailSent} label="Klinika" />
                    <EmailFlag ok={r.staffPdfEmailSent} label="PDF" />
                    <EmailFlag ok={r.patientEmailSent} label="Pacijent" />
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <a
                    href={`/api/admin/questionnaire-submissions/${r.id}/pdf`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9dccb] bg-[#fdf9f3] px-2.5 py-1.5 text-xs font-semibold text-[#5c4f44] transition hover:bg-white"
                    download
                  >
                    <Download size={13} className="text-[#e8682a]" />
                    Preuzmi
                  </a>
                  <div className="mt-1 text-[10px] text-[#8a7b6e]">
                    {formatBytes(r.pdfSizeBytes)}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
