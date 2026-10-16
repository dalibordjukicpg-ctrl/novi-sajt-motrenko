"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";

import { testChatbotAction } from "@/app/admin/(authed)/chatbot/actions";
import type { BotReply } from "@/lib/chatbot/answer";
import { locales } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<BotReply["kind"], { label: string; tone: string }> = {
  answer: { label: "Odgovor pronađen", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  smalltalk: { label: "Pozdrav", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  medical: { label: "Medicinsko pitanje → ljekar", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  unknown: { label: "Bot ne zna", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
};

/** Admin: pitaj bota i vidi tačno šta bi pacijent dobio i iz kog izvora. */
export function ChatbotTestPanel() {
  const [locale, setLocale] = useState<string>("me");
  const [q, setQ] = useState("");
  const [reply, setReply] = useState<BotReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (!q.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await testChatbotAction(locale, q);
      if (!res.ok || !res.reply) {
        setError(res.error ?? "Greška.");
        setReply(null);
        return;
      }
      setReply(res.reply);
    });
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex flex-wrap gap-2"
      >
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="rounded-lg border border-[#e9dccb] bg-white px-2 py-2 text-sm"
          aria-label="Jezik"
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="npr. Koliko košta IVF?"
          className="min-w-[200px] flex-1 rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-sm outline-none focus:border-[#e8682a]"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8682a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d45a1f] disabled:opacity-50"
        >
          <Send size={14} />
          {pending ? "Tražim…" : "Pitaj"}
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {reply ? (
        <div className="space-y-2 rounded-xl border border-[#e9dccb] bg-[#fdf9f3] p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", KIND_LABEL[reply.kind].tone)}>
              {KIND_LABEL[reply.kind].label}
            </span>
            <span className="font-mono text-xs text-[#8a7b6e]">izvor: {reply.statKey}</span>
          </div>
          {reply.title ? <p className="font-semibold text-[#2a2118]">{reply.title}</p> : null}
          <p className="whitespace-pre-line text-[#3d3229]">{reply.text}</p>
          {reply.links.length ? (
            <p className="text-xs text-[#6b5f54]">Dugmad: {reply.links.map((l) => `${l.label} (${l.href})`).join(" · ")}</p>
          ) : null}
          {reply.suggestions.length ? (
            <p className="text-xs text-[#6b5f54]">Predlozi: {reply.suggestions.join(" · ")}</p>
          ) : null}
          {reply.offerHandoff ? <p className="text-xs text-[#6b5f54]">Nudi „Pošalji poruku osoblju”.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
