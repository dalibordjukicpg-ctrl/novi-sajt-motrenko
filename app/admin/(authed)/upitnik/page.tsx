import Link from "next/link";
import { redirect, unauthorized } from "next/navigation";
import {
  ClipboardList,
  ExternalLink,
  Inbox,
  Mail,
} from "lucide-react";

import { UpitnikPublicLinks } from "@/components/admin/upitnik-public-links";
import { UpitnikSubmissionsTable } from "@/components/admin/upitnik-submissions-table";
import { UpitnikTestEmailPanel } from "@/components/admin/upitnik-test-email-panel";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { resolveUpitnikNotifyInbox } from "@/lib/email/resolve-notify-inbox";
import { listQuestionnaireSubmissionsForAdmin } from "@/lib/queries/questionnaire-submissions-admin";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function UpitnikAdminPage() {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const siteUrl = (getSiteUrl() || "").replace(/\/$/, "");
  const notifyTo = resolveUpitnikNotifyInbox();
  const submissions = await listQuestionnaireSubmissionsForAdmin(200);

  const urls = [
    { locale: "me", flag: "🇲🇪", label: "Crnogorski", path: "/me/upitnik" },
    { locale: "en", flag: "🇬🇧", label: "Engleski", path: "/en/upitnik" },
    { locale: "ru", flag: "🇷🇺", label: "Ruski", path: "/ru/upitnik" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <header className="mb-8 flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8682a]/10 text-[#e8682a]">
          <ClipboardList size={22} strokeWidth={1.8} />
        </div>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
            Upitnik za pacijente
          </h1>
          <p className="mt-1 text-sm text-[#6b5f54]">
            Interaktivna online forma koju pacijenti popunjavaju umjesto da preuzimaju DOCX upitnik.
            Stranica je skrivena — ne pojavljuje se u meniju, footeru ni Google pretrazi.
          </p>
        </div>
      </header>

      {/* Stranice po jeziku */}
      <section className="mb-6 rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ExternalLink size={16} className="text-[#e8682a]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
            Javni link upitnika
          </h2>
        </div>
        <UpitnikPublicLinks links={urls} siteUrl={siteUrl} />
        <p className="mt-4 text-xs text-[#8a7b6e] leading-relaxed">
          Ovaj link možete poslati pacijentu putem Vibera, WhatsApp-a ili emaila. Pacijent popunjava
          formu direktno u browseru — sve odgovore primićete na email naveden ispod.
        </p>
      </section>

      {/* Email konfiguracija */}
      <section className="mb-6 rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Mail size={16} className="text-[#e8682a]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
            Email primalac
          </h2>
        </div>
        <div className="rounded-xl border border-[#f3ecdf] bg-[#fdf9f3] px-4 py-3">
          <p className="text-xs text-[#8a7b6e] uppercase tracking-wider font-semibold mb-1">
            Odgovori sa upitnika idu na
          </p>
          <p className="text-base font-mono font-semibold text-[#2a2118]">{notifyTo}</p>
        </div>
        <p className="mt-3 text-xs text-[#8a7b6e] leading-relaxed">
          Za promjenu primaoca, postavite <code className="px-1.5 py-0.5 rounded bg-neutral-100 text-[#2a2118]">UPITNIK_NOTIFY_EMAIL</code> ili <code className="px-1.5 py-0.5 rounded bg-neutral-100 text-[#2a2118]">CONTACT_FORM_NOTIFY_EMAIL</code> u env varijablama.
        </p>

        <div className="mt-5">
          <UpitnikTestEmailPanel notifyTo={notifyTo} />
        </div>
      </section>

      {/* Evidencija poslanih upitnika */}
      <section className="mb-6 rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Inbox size={16} className="text-[#e8682a]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
            Poslani upitnici
          </h2>
        </div>
        <p className="mb-4 text-xs text-[#8a7b6e] leading-relaxed">
          Svaki poslani upitnik se automatski čuva ovdje sa PDF arhivom — čak i ako email na{" "}
          <strong className="text-[#2a2118]">{notifyTo}</strong> ne stigne. Preuzmite PDF za
          štampu ili arhivu. Status kolone pokazuje da li je Resend prijavio uspješno slanje
          (zeleno) ili ne (crveno).
        </p>
        <UpitnikSubmissionsTable rows={submissions} />
      </section>

      {/* Linkovi u sidebar — quick links */}
      <section className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">Kako pacijent koristi upitnik</h2>
        </div>
        <ol className="space-y-2 text-sm text-[#6b5f54] leading-relaxed list-decimal list-inside">
          <li>Pošaljete pacijentu link iznad (npr. preko Vibera).</li>
          <li>Pacijent otvara link u browseru — vidi premium formu sa progress barom.</li>
          <li>Popunjava sekcije (Da/Ne dugmad, polja, dinamičke tabele).</li>
          <li>Klikne <strong>&laquo;Pošalji upitnik&raquo;</strong> — klinika dobija email + PDF na <strong className="text-[#2a2118]">{notifyTo}</strong>; pacijent dobija potvrdu na email iz forme. Kopija sa PDF-om uvijek ostaje u sekciji <strong>Poslani upitnici</strong> iznad.</li>
          <li>Pacijent vidi poruku potvrde <em>&laquo;Upitnik je uspješno poslat!&raquo;</em></li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={adminPath("pages")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9dccb] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4f44] hover:bg-[#fdf9f3] transition"
          >
            ← Sve stranice (CMS)
          </Link>
        </div>
      </section>
    </div>
  );
}
