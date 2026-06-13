"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Sparkles, RotateCcw, AlertTriangle } from "lucide-react";

import {
  autoTranslateQuestionnaireAction,
  resetQuestionnaireOverrideAction,
  type AutoTranslateResult,
} from "@/app/admin/(authed)/upitnik/actions";

type Props = {
  translateConfigured: boolean;
  hasOverrideEn: boolean;
  hasOverrideRu: boolean;
};

type Status = { kind: "idle" } | { kind: "ok"; count: number } | { kind: "err"; msg: string };

export function QuestionnaireTranslatePanel({ translateConfigured, hasOverrideEn, hasOverrideRu }: Props) {
  const [enStatus, setEnStatus] = useState<Status>({ kind: "idle" });
  const [ruStatus, setRuStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const [busyTarget, setBusyTarget] = useState<"en" | "ru" | null>(null);

  function runTranslate(target: "en" | "ru") {
    setBusyTarget(target);
    const setStatus = target === "en" ? setEnStatus : setRuStatus;
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res: AutoTranslateResult = await autoTranslateQuestionnaireAction(target);
      if (res.ok) {
        setStatus({ kind: "ok", count: res.count ?? 0 });
      } else {
        setStatus({ kind: "err", msg: res.error ?? "Nepoznata greška." });
      }
      setBusyTarget(null);
    });
  }

  const Lang = ({
    target,
    flag,
    label,
    status,
    hasOverride,
  }: {
    target: "en" | "ru";
    flag: string;
    label: string;
    status: Status;
    hasOverride: boolean;
  }) => {
    const isBusy = pending && busyTarget === target;
    return (
      <div className="rounded-xl border border-[#f3ecdf] bg-[#fdf9f3] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{flag}</span>
            <div>
              <p className="text-sm font-bold text-[#2a2118]">{label}</p>
              <p className="text-[11px] text-[#8a7b6e]">
                {hasOverride ? "Prevod aktivan iz baze" : "Koristi se default iz fajla"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runTranslate(target)}
              disabled={isBusy || !translateConfigured}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8682a] px-3 py-2 text-xs font-bold text-white hover:bg-[#c45418] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <><Loader2 size={13} className="animate-spin" /> Prevodim...</>
              ) : (
                <><Sparkles size={13} /> Prevedi AI-em</>
              )}
            </button>
            {hasOverride ? (
              <form action={resetQuestionnaireOverrideAction.bind(null, target)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-xs font-semibold text-[#5c4f44] hover:bg-[#fdf9f3] transition"
                >
                  <RotateCcw size={12} /> Resetuj
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {status.kind === "ok" ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>Prevod uspješan — {status.count} stringova upisano u bazu.</span>
          </div>
        ) : status.kind === "err" ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{status.msg}</span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      {!translateConfigured ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AI prevod nije konfigurisan.</p>
            <p className="mt-1 text-xs text-amber-700">
              Postavite <code className="px-1 rounded bg-amber-100">OPENAI_API_KEY</code> i <code className="px-1 rounded bg-amber-100">TRANSLATE_PROVIDER=openai</code> u <code className="px-1 rounded bg-amber-100">.env</code> da bi dugmad bila aktivna.
            </p>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        <Lang target="en" flag="🇬🇧" label="Engleski (EN)" status={enStatus} hasOverride={hasOverrideEn} />
        <Lang target="ru" flag="🇷🇺" label="Ruski (RU)" status={ruStatus} hasOverride={hasOverrideRu} />
      </div>
      <p className="mt-4 text-xs text-[#8a7b6e] leading-relaxed">
        AI prevod uzima crnogorske tekstove iz fajla <code className="px-1 py-0.5 rounded bg-neutral-100">lib/questionnaire-i18n.ts</code>, prevodi ih preko OpenAI-ja i upisuje u bazu kao override. Prevod je odmah aktivan na javnoj stranici.
      </p>
    </div>
  );
}
