import type { Metadata } from "next";

import { QuestionnaireForm } from "@/components/site/questionnaire-form";
import { isLocale } from "@/lib/i18n";
import { getQuestionnaireI18n } from "@/lib/questionnaire-i18n";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "me";
  const t = getQuestionnaireI18n(locale);
  return {
    title: t.page.title,
    robots: { index: false, follow: false },
  };
}

export default async function UpitnikPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "me";
  const t = getQuestionnaireI18n(locale);

  return (
    <main className="min-h-screen bg-neutral-50/60 pb-16">
      {/* Hero strip */}
      <div className="bg-white border-b border-neutral-100 py-8 sm:py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-[#e8682a] mb-3">
            {t.page.eyebrow}
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-3"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {t.page.title}
          </h1>
          <p className="text-neutral-500 text-[13px] sm:text-sm max-w-lg mx-auto leading-relaxed">
            {t.page.intro}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-[11px] text-neutral-400 px-3 py-1.5 rounded-full bg-emerald-50/60 border border-emerald-100/80">
            <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
            {t.page.confidential}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 pt-4 sm:pt-8">
        <QuestionnaireForm locale={locale} t={t} />
      </div>
    </main>
  );
}
