"use client";

import Link from "next/link";
import { Languages, RotateCcw } from "lucide-react";

import { resetQuestionnaireOverrideAction } from "@/app/admin/(authed)/upitnik/actions";
import { adminPath } from "@/lib/admin-base-path";

type Props = {
  hasOverrideEn: boolean;
  hasOverrideRu: boolean;
};

function LangRow({
  target,
  flag,
  label,
  hasOverride,
}: {
  target: "en" | "ru";
  flag: string;
  label: string;
  hasOverride: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#f3ecdf] bg-[#fdf9f3] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{flag}</span>
          <div>
            <p className="text-sm font-bold text-[#2a2118]">{label}</p>
            <p className="text-[11px] text-[#8a7b6e]">
              {hasOverride
                ? "Prilagođeni prevod iz baze"
                : "Koristi se default iz lib/questionnaire-i18n.ts"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={adminPath(`upitnik/prevod/${target}`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8682a] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#c45418]"
          >
            <Languages size={13} />
            Prevedi
          </Link>
          {hasOverride ? (
            <form action={resetQuestionnaireOverrideAction.bind(null, target)}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-xs font-semibold text-[#5c4f44] transition hover:bg-[#fdf9f3]"
              >
                <RotateCcw size={12} />
                Resetuj
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function QuestionnaireTranslatePanel({ hasOverrideEn, hasOverrideRu }: Props) {
  return (
    <div className="space-y-3">
      <LangRow target="en" flag="🇬🇧" label="Engleski (EN)" hasOverride={hasOverrideEn} />
      <LangRow target="ru" flag="🇷🇺" label="Ruski (RU)" hasOverride={hasOverrideRu} />
    </div>
  );
}
