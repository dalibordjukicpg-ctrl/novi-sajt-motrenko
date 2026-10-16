"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Wand2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  addStarterEntriesAction,
  deleteKnowledgeEntryAction,
  toggleKnowledgePublishedAction,
} from "@/app/admin/(authed)/chatbot/actions";
import { adminPath } from "@/lib/admin-base-path";
import type { KnowledgeEntryAdmin } from "@/lib/chatbot/admin-queries";
import { CHATBOT_CATEGORIES, chatbotCategoryLabel } from "@/lib/chatbot/categories";
import { cn } from "@/lib/utils";

export function ChatbotKnowledgeList({ entries }: { entries: KnowledgeEntryAdmin[] }) {
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

  const groups = CHATBOT_CATEGORIES.map((c) => ({
    ...c,
    items: entries.filter((e) => e.category === c.key),
  })).filter((g) => g.items.length > 0);
  const known = new Set<string>(CHATBOT_CATEGORIES.map((c) => c.key));
  const other = entries.filter((e) => !known.has(e.category));
  if (other.length) groups.push({ key: "ostalo", label: "Ostalo", items: other });

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e9dccb] bg-[#fdf9f3] p-6 text-center">
          <p className="text-sm text-[#5c4f44]">
            Baza znanja je prazna. Dodajte prvi unos ili ubacite predloške pitanja (cijene, uspješnost,
            prvi pregled, fond…) pa samo upišite odgovore.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(addStarterEntriesAction)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#e8682a] bg-white px-4 py-2 text-sm font-semibold text-[#e8682a] transition hover:bg-[#fff4ec] disabled:opacity-50"
          >
            <Wand2 size={15} />
            Dodaj predloške pitanja
          </button>
        </div>
      ) : null}

      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8a7b6e]">
            {chatbotCategoryLabel(g.key)} ({g.items.length})
          </h3>
          <ul className="divide-y divide-[#f0e6dc] overflow-hidden rounded-xl border border-[#e9dccb] bg-white">
            {g.items.map((e) => {
              const me = e.translations.me;
              const langs = (["en", "ru"] as const).filter((l) => e.translations[l].answer.trim());
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#2a2118]">{me.question || "(bez pitanja)"}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#8a7b6e]">
                      {me.answer.trim() ? me.answer : "Odgovor još nije upisan."}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#8a7b6e]">
                    ME{langs.map((l) => ` · ${l.toUpperCase()}`).join("")}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => toggleKnowledgePublishedAction(e.id, !e.published))}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition",
                      e.published
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                        : "bg-neutral-50 text-neutral-500 ring-neutral-200 hover:bg-neutral-100",
                    )}
                    title={e.published ? "Klik: sakrij od bota" : "Klik: objavi (bot ga koristi)"}
                  >
                    {e.published ? "Objavljeno" : "Skica"}
                  </button>
                  <Link
                    href={adminPath(`chatbot/${e.id}`)}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-[#5c4f44] transition hover:bg-[#fdf9f3]"
                    aria-label="Uredi"
                  >
                    <Pencil size={15} />
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Obrisati unos „${me.question}”?`)) {
                        run(() => deleteKnowledgeEntryAction(e.id));
                      }
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                    aria-label="Obriši"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
