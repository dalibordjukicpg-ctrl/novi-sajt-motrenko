import Link from "next/link";
import { ArrowLeft, Archive, Inbox } from "lucide-react";
import { redirect, unauthorized } from "next/navigation";

import { UpitnikSubmissionsTable } from "@/components/admin/upitnik-submissions-table";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { resolveUpitnikNotifyInbox } from "@/lib/email/resolve-notify-inbox";
import {
  countQuestionnaireSubmissionsForAdmin,
  listQuestionnaireSubmissionsForAdmin,
} from "@/lib/queries/questionnaire-submissions-admin";

export const dynamic = "force-dynamic";

export default async function UpitnikPrijaveAdminPage() {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const [submissions, total] = await Promise.all([
    listQuestionnaireSubmissionsForAdmin(500),
    countQuestionnaireSubmissionsForAdmin(),
  ]);
  const notifyTo = resolveUpitnikNotifyInbox();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8682a]/10 text-[#e8682a]">
            <Archive size={22} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
              Poslani upitnici
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6b5f54]">
              Arhiva svih poslanih upitnika sa PDF-om. Svaki upitnik se automatski
              čuva u bazi i na disku servera — čak i ako email na kliniku ne stigne.
            </p>
          </div>
        </div>
        <Link
          href={adminPath("upitnik")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-xs font-semibold text-[#5c4f44] transition hover:bg-[#fdf9f3]"
        >
          <ArrowLeft size={14} />
          Podešavanja upitnika
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e9dccb] bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a7b6e]">
            Ukupno arhivirano
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#2a2118]">{total}</p>
        </div>
        <div className="rounded-xl border border-[#e9dccb] bg-white px-4 py-3 shadow-sm sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a7b6e]">
            Email primalac (klinika)
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-[#2a2118]">
            {notifyTo}
          </p>
          <p className="mt-1 text-xs text-[#8a7b6e]">
            Crveni status u tabeli = email nije potvrđen — PDF i dalje možete
            preuzeti ovdje.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Inbox size={16} className="text-[#e8682a]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
            PDF arhiva ({submissions.length}
            {submissions.length >= 500 ? "+" : ""})
          </h2>
        </div>
        <UpitnikSubmissionsTable rows={submissions} showDetailsLink />
      </section>
    </div>
  );
}
