"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useState, useTransition } from "react";

import { saveKnowledgeEntryAction } from "@/app/admin/(authed)/chatbot/actions";
import { adminPath } from "@/lib/admin-base-path";
import type { KnowledgeEntryAdmin } from "@/lib/chatbot/admin-queries";
import { CHATBOT_CATEGORIES } from "@/lib/chatbot/categories";
import { locales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TAB_HINT: Record<Locale, string> = {
  me: "Obavezno. Bot ovo koristi i kad EN/RU prevod nije upisan.",
  en: "Opciono — engleska verzija sajta (/en).",
  ru: "Opciono — ruska verzija sajta (/ru).",
};

export function ChatbotEntryForm({ entry }: { entry: KnowledgeEntryAdmin | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Locale>("me");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveKnowledgeEntryAction(formData);
      if (!res.ok) {
        setMessage({ ok: false, text: res.error ?? "Snimanje nije uspjelo." });
        return;
      }
      if (!entry && res.id) {
        router.replace(adminPath(`chatbot/${res.id}?sacuvano=1`));
        return;
      }
      setMessage({ ok: true, text: "Sačuvano. Bot odmah koristi novi tekst." });
      router.refresh();
    });
  };

  const field =
    "w-full rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-sm text-[#2a2118] outline-none focus:border-[#e8682a]";

  return (
    <form action={submit} className="space-y-6">
      <input type="hidden" name="entryId" value={entry?.id ?? ""} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={adminPath("chatbot")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9dccb] bg-white px-3 py-2 text-xs font-semibold text-[#5c4f44] transition hover:bg-[#fdf9f3]"
        >
          <ArrowLeft size={14} />
          Baza znanja
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8682a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d45a1f] disabled:opacity-50"
        >
          <Save size={15} />
          {pending ? "Čuvam…" : "Sačuvaj"}
        </button>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-[#5c4f44]">Kategorija</span>
          <select name="category" defaultValue={entry?.category ?? "opste"} className={field}>
            {CHATBOT_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-[#5c4f44]">Redosljed</span>
          <input name="sortOrder" type="number" defaultValue={entry?.sortOrder ?? 0} className={field} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-semibold text-[#5c4f44]">Link uz odgovor (opciono)</span>
          <input
            name="linkHref"
            defaultValue={entry?.linkHref ?? ""}
            placeholder="npr. /s/ivf, #kontakt ili https://…"
            className={field}
          />
          <span className="block text-xs text-[#8a7b6e]">Bot ispod odgovora prikazuje dugme „Pročitajte više”.</span>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="published" value="1" defaultChecked={entry?.published ?? true} />
          <span className="font-semibold text-[#5c4f44]">Objavljeno</span>
          <span className="text-xs text-[#8a7b6e]">— bot koristi samo objavljene unose.</span>
        </label>
      </section>

      <section className="rounded-2xl border border-[#e9dccb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-1 border-b border-[#f0e6dc]">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition",
                tab === l ? "border-[#e8682a] text-[#e8682a]" : "border-transparent text-[#8a7b6e] hover:text-[#5c4f44]",
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {locales.map((l) => {
          const t = entry?.translations[l];
          return (
            // Sva tri jezika ostaju u formi (skriveni tabovi se takođe šalju).
            <div key={l} className={cn("space-y-4", tab === l ? "block" : "hidden")}>
              <p className="text-xs text-[#8a7b6e]">{TAB_HINT[l]}</p>
              <label className="block space-y-1 text-sm">
                <span className="font-semibold text-[#5c4f44]">Pitanje</span>
                <input
                  name={`question_${l}`}
                  defaultValue={t?.question ?? ""}
                  placeholder={l === "me" ? "npr. Koliko košta IVF postupak?" : ""}
                  className={field}
                  maxLength={500}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-semibold text-[#5c4f44]">Ključne riječi</span>
                <input
                  name={`keywords_${l}`}
                  defaultValue={t?.keywords ?? ""}
                  placeholder={l === "me" ? "cijena, košta, ivf, vantjelesna, cjenovnik" : ""}
                  className={field}
                  maxLength={1000}
                />
                <span className="block text-xs text-[#8a7b6e]">
                  Riječi koje pacijenti koriste za ovo pitanje (i one kojih nema u pitanju). Padeži i
                  ijekavica/ekavica se prepoznaju sami.
                </span>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-semibold text-[#5c4f44]">Odgovor</span>
                <textarea
                  name={`answer_${l}`}
                  defaultValue={t?.answer ?? ""}
                  rows={8}
                  maxLength={5000}
                  className={cn(field, "leading-relaxed")}
                  placeholder={l === "me" ? "Kratko i jasno, kao da odgovarate pacijentu na telefonu." : ""}
                />
              </label>
            </div>
          );
        })}
      </section>
    </form>
  );
}
