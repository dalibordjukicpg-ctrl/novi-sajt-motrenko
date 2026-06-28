import Link from "next/link";
import { notFound, redirect, unauthorized } from "next/navigation";
import {
  ArrowLeft,
  Download,
  MailCheck,
  MailX,
  User,
} from "lucide-react";

import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { getQuestionnaireSubmissionByIdForAdmin } from "@/lib/queries/questionnaire-submissions-admin";

export const dynamic = "force-dynamic";

function formatTs(d: Date) {
  try {
    return new Intl.DateTimeFormat("sr-Latn-ME", {
      dateStyle: "long",
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

function EmailStatus({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        ok
          ? "border-emerald-200 bg-emerald-50"
          : "border-rose-200 bg-rose-50"
      }`}
    >
      {ok ? (
        <MailCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <MailX size={18} className="mt-0.5 shrink-0 text-rose-600" />
      )}
      <div>
        <p
          className={`text-sm font-semibold ${ok ? "text-emerald-800" : "text-rose-800"}`}
        >
          {label}
        </p>
        <p className={`mt-0.5 text-xs ${ok ? "text-emerald-700" : "text-rose-700"}`}>
          {detail}
        </p>
      </div>
    </div>
  );
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UpitnikPrijavaDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const { id } = await params;
  if (id.length !== 36) notFound();

  const row = await getQuestionnaireSubmissionByIdForAdmin(id);
  if (!row) notFound();

  const emailAllOk =
    row.staffEmailSent && row.staffPdfEmailSent && row.patientEmailSent;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={adminPath("upitnik/prijave")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a7b6e] transition hover:text-[#e8682a]"
      >
        <ArrowLeft size={14} />
        Nazad na arhivu
      </Link>

      <header className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a7b6e]">
              Upitnik · {row.locale.toUpperCase()}
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-[#2a2118]">
              {row.femaleName}
            </h1>
            <p className="mt-1 text-sm text-[#6b5f54]">{formatTs(row.createdAt)}</p>
            <p className="mt-2 font-mono text-[11px] text-[#8a7b6e]">ID: {row.id}</p>
          </div>
          <a
            href={`/api/admin/questionnaire-submissions/${row.id}/pdf`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#e8682a] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#c45418]"
            download
          >
            <Download size={18} />
            Preuzmi PDF
          </a>
        </div>
        <p className="mt-4 text-xs text-[#8a7b6e]">
          PDF: {row.pdfFilename} · {formatBytes(row.pdfSizeBytes)}
        </p>
      </header>

      {!emailAllOk ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Napomena:</strong> email možda nije stigao na kliniku ili pacijenta.
          PDF je sačuvan u arhivi — preuzmite ga dugmetom iznad.
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
          Status emaila
        </h2>
        <div className="space-y-3">
          <EmailStatus
            ok={row.staffEmailSent}
            label="Email klinici"
            detail={
              row.staffEmailSent
                ? "Resend je prijavio uspješno slanje."
                : "Slanje na kliniku nije potvrđeno — koristite PDF arhivu."
            }
          />
          <EmailStatus
            ok={row.staffPdfEmailSent}
            label="PDF u emailu klinici"
            detail={
              row.staffPdfEmailSent
                ? "PDF prilog je poslan uz email klinici."
                : "PDF možda nije bio u emailu — preuzmite iz arhive."
            }
          />
          <EmailStatus
            ok={row.patientEmailSent}
            label="Potvrda pacijentu"
            detail={
              row.patientEmailSent
                ? "Pacijent je dobio potvrdu na email."
                : "Potvrda pacijentu nije poslata."
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <User size={16} className="text-[#e8682a]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
            Kontakt
          </h2>
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-[#8a7b6e]">
              Ženski partner
            </dt>
            <dd className="mt-1 font-medium text-[#2a2118]">{row.femaleName}</dd>
            <dd className="mt-0.5 break-all text-[#6b5f54]">
              <a
                href={`mailto:${encodeURIComponent(row.femaleEmail)}`}
                className="text-[#c55a15] hover:underline"
              >
                {row.femaleEmail}
              </a>
            </dd>
          </div>
          {row.maleName ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#8a7b6e]">
                Muški partner
              </dt>
              <dd className="mt-1 font-medium text-[#2a2118]">{row.maleName}</dd>
              {row.maleEmail ? (
                <dd className="mt-0.5 break-all text-[#6b5f54]">
                  <a
                    href={`mailto:${encodeURIComponent(row.maleEmail)}`}
                    className="text-[#c55a15] hover:underline"
                  >
                    {row.maleEmail}
                  </a>
                </dd>
              ) : null}
            </div>
          ) : null}
          {row.phone ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#8a7b6e]">
                Telefon
              </dt>
              <dd className="mt-1">
                <a
                  href={`tel:${row.phone.replace(/\s/g, "")}`}
                  className="text-[#c55a15] hover:underline"
                >
                  {row.phone}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
