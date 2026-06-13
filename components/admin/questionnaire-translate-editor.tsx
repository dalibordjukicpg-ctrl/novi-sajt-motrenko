"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Save, Search } from "lucide-react";

import { saveQuestionnaireTranslationAction } from "@/app/admin/(authed)/upitnik/actions";
import type { FlatI18nItem } from "@/lib/questionnaire-i18n-flat";

type Props = {
  locale: "en" | "ru";
  localeLabel: string;
  meItems: FlatI18nItem[];
  initialTarget: FlatI18nItem[];
};

function pathLabel(path: string): string {
  return path.replace(/^\./, "").replace(/\./g, " › ");
}

export function QuestionnaireTranslateEditor({
  locale,
  localeLabel,
  meItems,
  initialTarget,
}: Props) {
  const [items, setItems] = useState(initialTarget);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const meMap = useMemo(() => new Map(meItems.map((x) => [x.path, x.value])), [meItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => {
      const me = meMap.get(x.path) ?? "";
      return (
        x.path.toLowerCase().includes(q) ||
        x.value.toLowerCase().includes(q) ||
        me.toLowerCase().includes(q)
      );
    });
  }, [items, meMap, query]);

  function update(path: string, value: string) {
    setItems((prev) => prev.map((x) => (x.path === path ? { ...x, value } : x)));
    setStatus("idle");
  }

  function save() {
    startTransition(async () => {
      const res = await saveQuestionnaireTranslationAction(locale, items);
      if (res.ok) {
        setStatus("ok");
        setMessage(
          res.count && res.count > 0
            ? `Sačuvano — ${res.count} izmjena u bazi.`
            : "Nema izmjena — koristi se default iz fajla.",
        );
      } else {
        setStatus("err");
        setMessage(res.error ?? "Snimanje nije uspjelo.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7b6e]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraži po tekstu ili ključu…"
            className="w-full rounded-lg border border-[#e9dccb] bg-white py-2 pl-9 pr-3 text-sm text-[#2a2118] outline-none focus:border-[#e8682a]/50"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[#e8682a] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#c45418] disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Snimam…
            </>
          ) : (
            <>
              <Save size={15} />
              Sačuvaj prevod
            </>
          )}
        </button>
      </div>

      {status === "ok" ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}
      {status === "err" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {message}
        </div>
      ) : null}

      <p className="text-xs text-[#8a7b6e]">
        Lijevo je crnogorski izvor, desno unosite {localeLabel}. Prikazano{" "}
        <strong>{filtered.length}</strong> od {items.length} stringova.
      </p>

      <div className="divide-y divide-[#f0e6dc] rounded-xl border border-[#f0e6dc] bg-white">
        {filtered.map((row) => {
          const me = meMap.get(row.path) ?? "—";
          return (
            <div key={row.path} className="grid gap-3 p-4 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-[#8a7b6e]">
                  {pathLabel(row.path)}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#5c4f44]">{me}</p>
              </div>
              <div className="min-w-0">
                <textarea
                  value={row.value}
                  onChange={(e) => update(row.path, e.target.value)}
                  rows={Math.min(6, Math.max(2, Math.ceil(row.value.length / 60)))}
                  className="w-full resize-y rounded-lg border border-[#e9dccb] bg-[#fdf9f3] px-3 py-2 text-sm text-[#2a2118] outline-none focus:border-[#e8682a]/50"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
