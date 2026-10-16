"use client";

import { useRouter } from "next/navigation";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteHandoffAction, setHandoffStatusAction } from "@/app/admin/(authed)/chatbot/actions";
import type { ChatbotHandoffAdmin } from "@/lib/chatbot/admin-queries";
import { cn } from "@/lib/utils";

function formatTs(d: Date) {
  try {
    return new Intl.DateTimeFormat("sr-Latn-ME", { dateStyle: "short", timeStyle: "short" }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function ChatbotHandoffsTable({ rows, canDelete }: { rows: ChatbotHandoffAdmin[]; canDelete: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Greška.");
      router.refresh();
    });
  };

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-[#8a7b6e]">Još nema poruka iz chata.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-3">
        {rows.map((r) => {
          const isNew = r.status === "new";
          const contactHref = r.contact.includes("@")
            ? `mailto:${r.contact}`
            : `tel:${r.contact.replace(/[^\d+]/g, "")}`;
          return (
            <li
              key={r.id}
              className={cn(
                "rounded-xl border bg-white p-4 shadow-sm",
                isNew ? "border-[#e8682a]/50" : "border-[#e9dccb] opacity-75",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {isNew ? (
                  <span className="rounded-full bg-[#e8682a] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Nova</span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200">
                    Riješeno
                  </span>
                )}
                <span className="font-semibold text-[#2a2118]">{r.fullName}</span>
                <a href={contactHref} className="font-mono text-[#e8682a] underline">
                  {r.contact}
                </a>
                <span className="text-xs text-[#8a7b6e]">
                  {formatTs(r.createdAt)} · {r.locale.toUpperCase()}
                  {r.emailSent ? " · email poslat" : ""}
                </span>
                <span className="ml-auto flex gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setHandoffStatusAction(r.id, isNew ? "done" : "new"))}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e9dccb] px-2.5 py-1 text-xs font-semibold text-[#5c4f44] transition hover:bg-[#fdf9f3]"
                  >
                    {isNew ? <Check size={13} /> : <RotateCcw size={13} />}
                    {isNew ? "Riješeno" : "Vrati u nove"}
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Obrisati poruku od ${r.fullName}?`)) run(() => deleteHandoffAction(r.id));
                      }}
                      className="inline-flex size-7 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                      aria-label="Obriši"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-[#3d3229]">{r.message}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
