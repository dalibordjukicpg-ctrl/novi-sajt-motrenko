import Link from "next/link";
import { redirect, unauthorized } from "next/navigation";
import { ArrowLeft, FileCode, Languages } from "lucide-react";

import { QuestionnaireTranslateEditor } from "@/components/admin/questionnaire-translate-editor";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { flattenQuestionnaireI18n } from "@/lib/questionnaire-i18n-flat";
import { getQuestionnaireI18n } from "@/lib/questionnaire-i18n";
import { getQuestionnaireI18nMerged } from "@/lib/questionnaire-overrides";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

const META = {
  en: { flag: "🇬🇧", label: "Engleski (EN)" },
  ru: { flag: "🇷🇺", label: "Ruski (RU)" },
} as const;

export default async function UpitnikPrevodPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const { locale: raw } = await params;
  if (raw !== "en" && raw !== "ru") {
    redirect(adminPath("upitnik"));
  }

  const meta = META[raw];
  const meItems = flattenQuestionnaireI18n(getQuestionnaireI18n("me"));
  const merged = await getQuestionnaireI18nMerged(raw);
  const initialTarget = flattenQuestionnaireI18n(merged);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={adminPath("upitnik")}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a7b6e] transition hover:text-[#e8682a]"
          >
            <ArrowLeft size={14} />
            Nazad na upitnik
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.flag}</span>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
                Prevod upitnika — {meta.label}
              </h1>
              <p className="mt-1 text-sm text-[#6b5f54]">
                Ručno unesite prevod za svaki string. Crnogorski (ME) je referenca — ne mijenja se
                ovdje.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#f3ecdf] bg-[#fdf9f3] px-4 py-3">
        <FileCode size={18} className="mt-0.5 shrink-0 text-[#e8682a]" />
        <p className="text-xs leading-relaxed text-[#6b5f54]">
          Default prevodi su u{" "}
          <code className="rounded bg-white px-1 font-mono text-[#2a2118]">
            lib/questionnaire-i18n.ts
          </code>
          . Ovdje snimljene izmjene idu u bazu i odmah su vidljive na{" "}
          <code className="rounded bg-white px-1 font-mono">/{raw}/upitnik</code>. Email klinici je
          uvijek na crnogorskom.
        </p>
      </div>

      <section className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Languages size={16} className="text-[#e8682a]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
            Editor prevoda
          </h2>
        </div>
        <QuestionnaireTranslateEditor
          locale={raw}
          localeLabel={meta.label}
          meItems={meItems}
          initialTarget={initialTarget}
        />
      </section>
    </div>
  );
}
