import Link from "next/link";
import { redirect, unauthorized } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileCode,
  Languages,
  Mail,
} from "lucide-react";

import { QuestionnaireTranslatePanel } from "@/components/admin/questionnaire-translate-panel";
import { UpitnikPublicLinks } from "@/components/admin/upitnik-public-links";
import { UpitnikTestEmailPanel } from "@/components/admin/upitnik-test-email-panel";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { DEFAULT_NOTIFY_INBOX } from "@/lib/email/resolve-notify-inbox";
import { isMachineTranslateConfigured } from "@/lib/machine-translate";
import { hasQuestionnaireOverride } from "@/lib/questionnaire-overrides";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type Search = {
  reset?: string;
};

export default async function UpitnikAdminPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const sp = await searchParams;
  const siteUrl = (getSiteUrl() || "").replace(/\/$/, "");
  const notifyTo = process.env.UPITNIK_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_INBOX;
  const translateConfigured = isMachineTranslateConfigured();
  const [hasOverrideEn, hasOverrideRu] = await Promise.all([
    hasQuestionnaireOverride("en"),
    hasQuestionnaireOverride("ru"),
  ]);

  const urls = [
    { locale: "me", flag: "🇲🇪", label: "Crnogorski", path: "/me/upitnik" },
    { locale: "en", flag: "🇬🇧", label: "Engleski", path: "/en/upitnik" },
    { locale: "ru", flag: "🇷🇺", label: "Ruski", path: "/ru/upitnik" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
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

      {/* Banner: reset prevoda */}
      {sp.reset ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Override za <strong>{sp.reset.toUpperCase()}</strong> je obrisan.</p>
            <p className="mt-1 text-emerald-700">Stranica sada koristi originalni prevod iz fajla.</p>
          </div>
        </div>
      ) : null}

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
          Za promjenu primaoca, postavite varijablu <code className="px-1.5 py-0.5 rounded bg-neutral-100 text-[#2a2118]">UPITNIK_NOTIFY_EMAIL</code> u <code className="px-1.5 py-0.5 rounded bg-neutral-100 text-[#2a2118]">.env</code> fajlu i restartujte server.
        </p>

        <div className="mt-5">
          <UpitnikTestEmailPanel notifyTo={notifyTo} />
        </div>
      </section>

      {/* Prevodi — AI */}
      <section className="mb-6 rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Languages size={16} className="text-[#e8682a]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
            AI prevod upitnika
          </h2>
        </div>
        <p className="mb-4 text-sm text-[#6b5f54] leading-relaxed">
          Jednim klikom prevedite cijeli upitnik (sva pitanja, opcije i dugmad) sa crnogorskog na engleski ili ruski. Prevod se odmah upisuje u bazu i aktivan je na javnoj stranici.
        </p>
        <QuestionnaireTranslatePanel
          translateConfigured={translateConfigured}
          hasOverrideEn={hasOverrideEn}
          hasOverrideRu={hasOverrideRu}
        />

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#f3ecdf] bg-[#fdf9f3] px-4 py-3">
          <FileCode size={18} className="shrink-0 text-[#e8682a] mt-0.5" />
          <div className="text-xs text-[#6b5f54] leading-relaxed">
            <p>Originalni (crnogorski) tekstovi su u fajlu <code className="px-1 py-0.5 rounded bg-neutral-100 font-mono text-[#2a2118]">lib/questionnaire-i18n.ts</code>. AI prevod ide iz njega.</p>
            <p className="mt-1">Email klinici je <strong>uvijek na crnogorskom</strong> — ako pacijent ispuni na EN/RU, slobodni tekstovi se automatski prevode nazad.</p>
          </div>
        </div>
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
          <li>Klikne <strong>&laquo;Pošalji upitnik&raquo;</strong> — vi dobijate formatirani HTML email sa svim odgovorima na: <strong className="text-[#2a2118]">{notifyTo}</strong></li>
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
