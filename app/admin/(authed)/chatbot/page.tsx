import Link from "next/link";
import { Bot, BookOpenCheck, Plus, Sparkles } from "lucide-react";
import { redirect, unauthorized } from "next/navigation";

import { ChatbotKnowledgeList } from "@/components/admin/chatbot-knowledge-list";
import { ChatbotTestPanel } from "@/components/admin/chatbot-test-panel";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { countNewChatbotHandoffs, listKnowledgeEntriesForAdmin } from "@/lib/chatbot/admin-queries";
import { getChatbotStatsSummary } from "@/lib/chatbot/stats";

export const dynamic = "force-dynamic";

const BUILTIN_LABELS: Record<string, string> = {
  "builtin:hours": "Radno vrijeme (automatski)",
  "builtin:location": "Lokacija (automatski)",
  "builtin:contact": "Kontakt (automatski)",
  "builtin:team": "Naš tim (automatski)",
  "builtin:booking": "Zakazivanje (automatski)",
  "smalltalk:hello": "Pozdrav",
  "smalltalk:thanks": "Zahvala",
};

export default async function ChatbotAdminPage() {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const [entries, stats, newHandoffs] = await Promise.all([
    listKnowledgeEntriesForAdmin(),
    getChatbotStatsSummary(30),
    countNewChatbotHandoffs(),
  ]);
  const questionById = new Map(entries.map((e) => [`entry:${e.id}`, e.translations.me.question]));
  const labelFor = (key: string) =>
    questionById.get(key) ??
    BUILTIN_LABELS[key] ??
    (key.startsWith("page:") ? `Stranica /s/${key.slice(5)}` : key.startsWith("post:") ? `Članak /posts/${key.slice(5)}` : key);

  const published = entries.filter((e) => e.published).length;
  const t = stats.totals;
  const cards = [
    { label: "Otvaranja chata", value: t.open },
    { label: "Pitanja", value: t.question },
    { label: "Odgovoreno", value: t.answered },
    { label: "Bot nije znao", value: t.unknown, warn: t.unknown > 0 },
    { label: "Medicinska pitanja", value: t.medical },
    { label: "Poruke osoblju", value: t.handoff },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8682a]/10 text-[#e8682a]">
            <Bot size={22} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">Chat bot — baza znanja</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6b5f54]">
              Bot odgovara samo iz onoga što piše ovdje i na sajtu — ništa ne izmišlja. Medicinska pitanja
              (nalazi, terapija, simptomi) uvijek upućuje na ljekara.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {newHandoffs > 0 ? (
            <Link
              href={adminPath("chatbot/poruke")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8682a] bg-[#fff4ec] px-3 py-2 text-xs font-semibold text-[#c4561a] transition hover:bg-[#ffe9da]"
            >
              Nove poruke osoblju: {newHandoffs}
            </Link>
          ) : null}
          <Link
            href={adminPath("chatbot/novi")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8682a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#d45a1f]"
          >
            <Plus size={14} />
            Novi unos
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-[#e9dccb] bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a7b6e]">{c.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${c.warn ? "text-[#c4561a]" : "text-[#2a2118]"}`}>{c.value}</p>
          </div>
        ))}
        <p className="text-xs text-[#8a7b6e] sm:col-span-3 lg:col-span-6">
          Posljednjih {stats.days} dana. Čuvaju se samo brojevi — tekst pitanja pacijenata se ne snima.
          Kad je „Bot nije znao” visoko, dodajte unose za česta pitanja.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenCheck size={16} className="text-[#e8682a]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">
              Unosi ({published} objavljeno od {entries.length})
            </h2>
          </div>
          <ChatbotKnowledgeList entries={entries} />
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#e9dccb] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-[#e8682a]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#5c4f44]">Probaj bota</h2>
            </div>
            <ChatbotTestPanel />
          </section>

          <section className="rounded-2xl border border-[#e9dccb] bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#5c4f44]">Bot već zna sam</h2>
            <ul className="space-y-1.5 text-[#5c4f44]">
              <li>
                <b>Radno vrijeme, adresa, telefon, email</b> — iz{" "}
                <Link className="text-[#e8682a] underline" href={adminPath("content/header-footer")}>
                  Footer i kontakt
                </Link>
              </li>
              <li>
                <b>Broj i imena ljekara</b> — iz{" "}
                <Link className="text-[#e8682a] underline" href={adminPath("content/team/members")}>
                  Profili članova
                </Link>
              </li>
              <li>
                <b>Postupci (IVF, IUI, histeroskopija…)</b> — iz{" "}
                <Link className="text-[#e8682a] underline" href={adminPath("pages")}>
                  Stranica
                </Link>{" "}
                i članaka
              </li>
            </ul>
            <p className="mt-2 text-xs text-[#8a7b6e]">
              Unos iz baze znanja ima prednost nad tekstom sa stranica.
            </p>
          </section>

          <section className="rounded-2xl border border-[#e9dccb] bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#5c4f44]">Najčešći odgovori</h2>
            {stats.topAnswers.length === 0 ? (
              <p className="text-[#8a7b6e]">Još nema podataka.</p>
            ) : (
              <ol className="space-y-1">
                {stats.topAnswers.map((a) => (
                  <li key={a.entryKey} className="flex justify-between gap-3">
                    <span className="truncate text-[#3d3229]">{labelFor(a.entryKey)}</span>
                    <span className="font-semibold text-[#2a2118]">{a.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
