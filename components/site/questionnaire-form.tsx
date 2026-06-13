"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Send, CheckCircle, Loader2, AlertCircle, Check } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import type { QuestionnaireI18n } from "@/lib/questionnaire-i18n";

// ---------- TYPE for translations passed in ----------
type T = QuestionnaireI18n;

// ---------- styles ----------
// Premium mobile-first input: larger touch target, bigger text on mobile (prevents iOS zoom)
const input =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-[16px] sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#e8682a] focus:outline-none focus:ring-2 focus:ring-[#e8682a]/20 transition";
const labelCls = "block text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-1 mt-3";
const dateInput = input + " [color-scheme:light]";

type YN = "da" | "ne" | "";

function YesNo({ value, onChange, t }: { value: YN; onChange: (v: YN) => void; t: T }) {
  return (
    <div className="flex gap-2 mt-1.5">
      {(["da", "ne"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`min-w-[80px] px-5 py-2.5 sm:py-1.5 rounded-full text-sm font-semibold border transition-all active:scale-[0.97] ${
            value === opt
              ? opt === "da"
                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                : "bg-red-400 border-red-400 text-white shadow-sm"
              : "border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300"
          }`}
        >
          {opt === "da" ? t.ui.yes : t.ui.no}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      {children}
    </div>
  );
}

type Row = Record<string, string>;

function DynamicTable({
  columns,
  rows,
  setRows,
  addLabel,
  t,
}: {
  columns: { key: string; label: string; type?: "date" | "text" | "yn" }[];
  rows: Row[];
  setRows: (r: Row[]) => void;
  addLabel: string;
  t: T;
}) {
  const empty = () => Object.fromEntries(columns.map((c) => [c.key, ""]));
  return (
    <div className="mt-3">
      {rows.map((row, i) => (
        <div key={i} className="relative mb-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <button
            type="button"
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
            className="absolute right-3 top-3 text-neutral-300 hover:text-red-400 transition p-1.5 -m-1.5"
            aria-label="Ukloni"
          >
            <Trash2 size={16} />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pr-7">
            {columns.map((col) => (
              <div key={col.key}>
                <p className={labelCls}>{col.label}</p>
                {col.type === "yn" ? (
                  <YesNo
                    value={(row[col.key] as YN) || ""}
                    onChange={(v) => {
                      const next = [...rows];
                      next[i] = { ...row, [col.key]: v };
                      setRows(next);
                    }}
                    t={t}
                  />
                ) : (
                  <input
                    type={col.type === "date" ? "date" : "text"}
                    value={row[col.key] ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, [col.key]: e.target.value };
                      setRows(next);
                    }}
                    className={col.type === "date" ? dateInput : input}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, empty()])}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#e8682a] hover:text-[#c45418] transition mt-1 py-2 px-1"
      >
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

// section that supports completion indicator
function Section({
  title,
  number,
  filled,
  children,
  defaultOpen = false,
}: {
  title: string;
  number: number;
  filled: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden mb-3 sm:mb-4 transition-all ${
        filled ? "border-emerald-100" : "border-neutral-100"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 text-left hover:bg-neutral-50 transition"
      >
        {/* Number / check badge */}
        <div
          className={`flex shrink-0 items-center justify-center size-8 rounded-full text-xs font-bold transition-all ${
            filled
              ? "bg-emerald-500 text-white"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {filled ? <Check size={15} strokeWidth={3} /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-neutral-800 text-[13px] sm:text-sm block leading-tight">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-neutral-400 shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-neutral-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-neutral-50">
          {children}
        </div>
      )}
    </div>
  );
}

function bKey(prefix: string, b: string) {
  return prefix + "_b_" + b.toLowerCase().replace(/[^a-zšđčćž]/g, "_").replace(/_+/g, "_");
}
function bDetKey(prefix: string, b: string) {
  return prefix + "_b_det_" + b.toLowerCase().replace(/[^a-zšđčćž]/g, "_").replace(/_+/g, "_");
}

function DiseaseBlock({ prefix, data, set, t }: { prefix: string; data: Record<string, string>; set: (k: string, v: string) => void; t: T }) {
  return (
    <div className="grid grid-cols-1 gap-3 mt-3">
      {t.diseases.map((b) => {
        const k = bKey(prefix, b);
        const dk = bDetKey(prefix, b);
        return (
          <div key={b} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-semibold text-neutral-700 mb-1">{b}</p>
            <YesNo value={(data[k] as YN) || ""} onChange={(v) => set(k, v)} t={t} />
            {data[k] === "da" && (
              <input
                type="text"
                placeholder={t.groups.details}
                value={data[dk] ?? ""}
                onChange={(e) => set(dk, e.target.value)}
                className={input + " mt-2"}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
type Props = {
  locale: Locale;
  t: T;
};

export function QuestionnaireForm({ locale, t }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Flat state
  const [d, setD] = useState<Record<string, string>>({});
  const set = useCallback((k: string, v: string) => setD((prev) => ({ ...prev, [k]: v })), []);

  // Table state
  const [zTrudnoce, setZTrudnoce] = useState<Row[]>([]);
  const [zArtTretmani, setZArtTretmani] = useState<Row[]>([]);
  const [zLijekovi, setZLijekovi] = useState<Row[]>([]);
  const [mLijekovi, setMLijekovi] = useState<Row[]>([]);
  const [zOperacije, setZOperacije] = useState<Row[]>([]);
  const [mOperacije, setMOperacije] = useState<Row[]>([]);

  // Section completion tracking based on key fields per section
  const SECTION_KEYS: Record<string, string[]> = useMemo(
    () => ({
      s1: ["z_ime", "z_email", "z_telefon", "m_ime"],
      s2: ["veza_godine", "trudnoca_veza", "pokusaj_godine"],
      s3a: ["z_starost", "z_visina", "z_tezina", "z_krv"],
      s3b: ["z_men_yn"],
      s3c: ["z_sekret_yn", "z_papa_yn"],
      s3d: ["z_trudnoca_ikad"],
      s3e: ["z_art_yn", "z_analize_yn"],
      s3f: ["z_sex_prob_yn", "z_spb_yn"],
      s3g: ["z_med_yn"],
      s3h: ["z_alergija_lijek", "z_alergija_lateks"],
      s3i: ["z_oboljenja_yn"],
      s3j: ["z_ginek_op_yn", "z_ostale_op_yn"],
      s3k: ["z_genetika_yn"],
      s3l: ["z_pusac", "z_alkohol"],
      s4a: ["m_starost", "m_visina", "m_krv"],
      s4b: ["m_trudnoca_yn"],
      s4c: ["m_sex_ucestalost", "m_spb_yn"],
      s4d: ["m_med_yn"],
      s4e: ["m_alergija_lijek"],
      s4f: ["m_oboljenja_yn", "m_op_yn"],
      s4g: ["m_pusac", "m_alkohol"],
    }),
    [],
  );

  const isSectionFilled = useCallback(
    (key: string): boolean => {
      const keys = SECTION_KEYS[key];
      if (!keys) return false;
      return keys.some((k) => (d[k] ?? "").trim() !== "");
    },
    [d, SECTION_KEYS],
  );

  const totalSections = Object.keys(SECTION_KEYS).length;
  const filledCount = Object.keys(SECTION_KEYS).filter((k) => isSectionFilled(k)).length;
  const progressPct = Math.round((filledCount / totalSections) * 100);

  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const payload = {
        ...d,
        z_trudnoce: zTrudnoce,
        z_art_tretmani: zArtTretmani,
        z_lijekovi: zLijekovi,
        m_lijekovi: mLijekovi,
        z_operacije: zOperacije,
        m_operacije: mOperacije,
        _locale: locale,
      };
      const res = await fetch("/api/upitnik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("error");
      setErrorMsg(t.ui.errorText);
    }
  }

  // Lock body scroll when success screen is shown? Not needed — section is enough.
  useEffect(() => {
    if (status === "error" && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [status]);

  if (status === "success") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-16 px-6">
        <div className="size-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6 ring-8 ring-emerald-50/60">
          <CheckCircle size={44} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-3">{t.ui.successTitle}</h2>
        <p className="text-neutral-500 max-w-md leading-relaxed">{t.ui.successText}</p>
      </div>
    );
  }

  // helper for buttons
  const optBtn = (active: boolean) =>
    `min-h-[44px] px-4 py-2.5 rounded-full text-sm font-semibold border transition-all active:scale-[0.97] ${
      active
        ? "bg-[#e8682a] border-[#e8682a] text-white shadow-sm"
        : "border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300"
    }`;

  return (
    <>
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 pb-2 bg-gradient-to-b from-neutral-50/95 to-neutral-50/85 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-neutral-600">
            {t.ui.progress.replace("{done}", String(filledCount)).replace("{total}", String(totalSections))}
          </span>
          <span className="text-[11px] font-bold text-[#e8682a]">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-200/70 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e8682a] to-[#f7894d] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2 pt-4 pb-32 sm:pb-12">
      {/* ── DIO 1 ── */}
      <Section title={t.sections.s1} number={1} filled={isSectionFilled("s1")} defaultOpen>
        <div className="mt-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e8682a] mb-3">{t.groups.femalePartner}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Field label={t.f.fullName}><input type="text" autoComplete="name" className={input} value={d.z_ime ?? ""} onChange={(e) => set("z_ime", e.target.value)} /></Field>
            <Field label={t.f.dob}><input type="date" className={dateInput} value={d.z_dob ?? ""} onChange={(e) => set("z_dob", e.target.value)} /></Field>
            <Field label={t.f.passport}><input type="text" className={input} value={d.z_pasos ?? ""} onChange={(e) => set("z_pasos", e.target.value)} /></Field>
            <Field label={t.f.email}><input type="email" autoComplete="email" inputMode="email" className={input} value={d.z_email ?? ""} onChange={(e) => set("z_email", e.target.value)} /></Field>
            <Field label={t.f.phone}><input type="tel" autoComplete="tel" inputMode="tel" className={input} value={d.z_telefon ?? ""} onChange={(e) => set("z_telefon", e.target.value)} /></Field>
            <Field label={t.f.occupation}><input type="text" className={input} value={d.z_zanimanje ?? ""} onChange={(e) => set("z_zanimanje", e.target.value)} /></Field>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-[#e8682a] mt-6 mb-3">{t.groups.malePartner}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Field label={t.f.fullName}><input type="text" className={input} value={d.m_ime ?? ""} onChange={(e) => set("m_ime", e.target.value)} /></Field>
            <Field label={t.f.dob}><input type="date" className={dateInput} value={d.m_dob ?? ""} onChange={(e) => set("m_dob", e.target.value)} /></Field>
            <Field label={t.f.passport}><input type="text" className={input} value={d.m_pasos ?? ""} onChange={(e) => set("m_pasos", e.target.value)} /></Field>
            <Field label={t.f.email}><input type="email" inputMode="email" className={input} value={d.m_email ?? ""} onChange={(e) => set("m_email", e.target.value)} /></Field>
            <Field label={t.f.phone}><input type="tel" inputMode="tel" className={input} value={d.m_telefon ?? ""} onChange={(e) => set("m_telefon", e.target.value)} /></Field>
            <Field label={t.f.occupation}><input type="text" className={input} value={d.m_zanimanje ?? ""} onChange={(e) => set("m_zanimanje", e.target.value)} /></Field>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-[#e8682a] mt-6 mb-3">{t.groups.asCouple}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Field label={t.f.maritalStatus}>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[t.opts.married, t.opts.unmarried].map((opt) => (
                  <button key={opt} type="button" onClick={() => set("bracni_status", opt)} className={optBtn(d.bracni_status === opt)}>{opt}</button>
                ))}
              </div>
            </Field>
            <Field label={t.f.country}><input type="text" className={input} value={d.drzava ?? ""} onChange={(e) => set("drzava", e.target.value)} /></Field>
            <Field label={t.f.prefComm}>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[t.opts.email, t.opts.phoneViber, t.opts.bothComm].map((opt) => (
                  <button key={opt} type="button" onClick={() => set("komunikacija", opt)} className={optBtn(d.komunikacija === opt)}>{opt}</button>
                ))}
              </div>
            </Field>
            <Field label={t.f.mainContact}>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[t.groups.femalePartner, t.groups.malePartner].map((opt) => (
                  <button key={opt} type="button" onClick={() => set("kontakt_osoba", opt)} className={optBtn(d.kontakt_osoba === opt)}>{opt}</button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* ── DIO 2 ── */}
      <Section title={t.sections.s2} number={2} filled={isSectionFilled("s2")}>
        <div className="grid grid-cols-2 gap-x-4 mt-2">
          <Field label={t.f.relYears}><input type="number" inputMode="numeric" min={0} className={input} value={d.veza_godine ?? ""} onChange={(e) => set("veza_godine", e.target.value)} placeholder="0" /></Field>
          <Field label={t.f.relMonths}><input type="number" inputMode="numeric" min={0} max={11} className={input} value={d.veza_mjeseci ?? ""} onChange={(e) => set("veza_mjeseci", e.target.value)} placeholder="0" /></Field>
        </div>

        <Field label={t.f.pregInRel}><YesNo value={(d.trudnoca_veza as YN) || ""} onChange={(v) => set("trudnoca_veza", v)} t={t} /></Field>
        {d.trudnoca_veza === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 grid grid-cols-2 gap-x-4 mt-2">
            <Field label={t.f.pregCount}><input type="number" inputMode="numeric" min={1} className={input} value={d.trudnoca_puta ?? ""} onChange={(e) => set("trudnoca_puta", e.target.value)} /></Field>
            <Field label={t.f.pregTerm}><input type="number" inputMode="numeric" min={0} className={input} value={d.trudnoca_termin ?? ""} onChange={(e) => set("trudnoca_termin", e.target.value)} /></Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 mt-2">
          <Field label={t.f.tryYears}><input type="number" inputMode="numeric" min={0} className={input} value={d.pokusaj_godine ?? ""} onChange={(e) => set("pokusaj_godine", e.target.value)} /></Field>
          <Field label={t.f.tryMonths}><input type="number" inputMode="numeric" min={0} max={11} className={input} value={d.pokusaj_mjeseci ?? ""} onChange={(e) => set("pokusaj_mjeseci", e.target.value)} /></Field>
        </div>

        <Field label={t.f.diagYn}><YesNo value={(d.dijagnoza_yn as YN) || ""} onChange={(v) => set("dijagnoza_yn", v)} t={t} /></Field>
        {d.dijagnoza_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Field label={t.f.diagFactor}>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[t.opts.maleFactor, t.opts.femaleFactor, t.opts.bothFactor].map((opt) => (
                  <button key={opt} type="button" onClick={() => set("dijagnoza_faktor", opt)} className={optBtn(d.dijagnoza_faktor === opt)}>{opt}</button>
                ))}
              </div>
            </Field>
            <Field label={t.f.diagText}><input type="text" className={input} value={d.dijagnoza_tekst ?? ""} onChange={(e) => set("dijagnoza_tekst", e.target.value)} /></Field>
            <Field label={t.f.diagYear}><input type="number" inputMode="numeric" min={1990} max={2030} className={input} value={d.dijagnoza_godina ?? ""} onChange={(e) => set("dijagnoza_godina", e.target.value)} /></Field>
          </div>
        )}

        <Field label={t.f.artYn}><YesNo value={(d.art_veza_yn as YN) || ""} onChange={(v) => set("art_veza_yn", v)} t={t} /></Field>
        {d.art_veza_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.artDetails}>
              <textarea rows={3} className={input + " resize-none"} value={d.art_veza_detalji ?? ""} onChange={(e) => set("art_veza_detalji", e.target.value)} />
            </Field>
          </div>
        )}

        <Field label={t.f.frozenYn}><YesNo value={(d.zamrznut_yn as YN) || ""} onChange={(v) => set("zamrznut_yn", v)} t={t} /></Field>
        {d.zamrznut_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.frozenDetails}><input type="text" className={input} value={d.zamrznut_detalji ?? ""} onChange={(e) => set("zamrznut_detalji", e.target.value)} /></Field>
            <Field label={t.f.frozenTransport}><YesNo value={(d.zamrznut_transport as YN) || ""} onChange={(v) => set("zamrznut_transport", v)} t={t} /></Field>
          </div>
        )}
      </Section>

      {/* ── DIO 3a ── */}
      <Section title={t.sections.s3a} number={3} filled={isSectionFilled("s3a")}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 mt-2">
          <Field label={t.f.age}><input type="number" inputMode="numeric" min={18} max={60} className={input} value={d.z_starost ?? ""} onChange={(e) => set("z_starost", e.target.value)} /></Field>
          <Field label={t.f.height}><input type="number" inputMode="numeric" className={input} value={d.z_visina ?? ""} onChange={(e) => set("z_visina", e.target.value)} /></Field>
          <Field label={t.f.weight}><input type="number" inputMode="numeric" className={input} value={d.z_tezina ?? ""} onChange={(e) => set("z_tezina", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
          <Field label={t.f.bloodGroup}>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {["O", "A", "B", "AB"].map((opt) => (
                <button key={opt} type="button" onClick={() => set("z_krv", opt)}
                  className={`min-h-[44px] w-12 rounded-lg text-sm font-bold border transition-all active:scale-[0.97] ${d.z_krv === opt ? "bg-[#e8682a] border-[#e8682a] text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}
                >{opt}</button>
              ))}
            </div>
          </Field>
          <Field label={t.f.rhFactor}>
            <div className="flex gap-2 mt-1.5">
              {[t.opts.positive, t.opts.negative].map((opt) => (
                <button key={opt} type="button" onClick={() => set("z_rh", opt)} className={optBtn(d.z_rh === opt)}>{opt}</button>
              ))}
            </div>
          </Field>
        </div>
        <Field label={t.f.fConcYn}><YesNo value={(d.z_zacece_yn as YN) || ""} onChange={(v) => set("z_zacece_yn", v)} t={t} /></Field>
        {d.z_zacece_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.fConcDur}><input type="text" className={input} value={d.z_zacece_trajanje ?? ""} onChange={(e) => set("z_zacece_trajanje", e.target.value)} /></Field>
          </div>
        )}
      </Section>

      {/* ── DIO 3b ── */}
      <Section title={t.sections.s3b} number={4} filled={isSectionFilled("s3b")}>
        <Field label={t.f.menarche}><input type="number" inputMode="numeric" min={8} max={20} className={input} value={d.z_men_godina ?? ""} onChange={(e) => set("z_men_godina", e.target.value)} /></Field>
        <Field label={t.f.cyclesYn}><YesNo value={(d.z_men_yn as YN) || ""} onChange={(v) => set("z_men_yn", v)} t={t} /></Field>
        {d.z_men_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 space-y-2 mt-2">
            <Field label={t.f.cyclesRegular}><YesNo value={(d.z_ciklus_redovni as YN) || ""} onChange={(v) => set("z_ciklus_redovni", v)} t={t} /></Field>
            {d.z_ciklus_redovni === "da" && (
              <Field label={t.f.cycleDays}><input type="number" inputMode="numeric" min={21} max={45} className={input} value={d.z_ciklus_dani ?? ""} onChange={(e) => set("z_ciklus_dani", e.target.value)} /></Field>
            )}
            {d.z_ciklus_redovni === "ne" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label={t.f.cycleMin}><input type="number" inputMode="numeric" className={input} value={d.z_ciklus_min ?? ""} onChange={(e) => set("z_ciklus_min", e.target.value)} /></Field>
                <Field label={t.f.cycleMax}><input type="number" inputMode="numeric" className={input} value={d.z_ciklus_max ?? ""} onChange={(e) => set("z_ciklus_max", e.target.value)} /></Field>
              </div>
            )}
            <Field label={t.f.bleedDays}><input type="number" inputMode="numeric" min={1} max={10} className={input} value={d.z_krvarenje_dani ?? ""} onChange={(e) => set("z_krvarenje_dani", e.target.value)} /></Field>
            <Field label={t.f.interBleed}><YesNo value={(d.z_medjukrvarenje as YN) || ""} onChange={(v) => set("z_medjukrvarenje", v)} t={t} /></Field>
            <Field label={t.f.bleedDesc}><textarea rows={2} className={input + " resize-none"} value={d.z_krvarenje_opis ?? ""} onChange={(e) => set("z_krvarenje_opis", e.target.value)} /></Field>
            <Field label={t.f.painfulMens}><YesNo value={(d.z_bolne as YN) || ""} onChange={(v) => set("z_bolne", v)} t={t} /></Field>
            <Field label={t.f.heavyMens}><YesNo value={(d.z_obilne as YN) || ""} onChange={(v) => set("z_obilne", v)} t={t} /></Field>
            {d.z_obilne === "da" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-3 pl-3 border-l-2 border-emerald-200">
                <Field label={t.f.clots}><YesNo value={(d.z_ugruski as YN) || ""} onChange={(v) => set("z_ugruski", v)} t={t} /></Field>
                <Field label={t.f.padsPerDay}><input type="number" inputMode="numeric" min={1} max={20} className={input} value={d.z_ulozaka ?? ""} onChange={(e) => set("z_ulozaka", e.target.value)} /></Field>
              </div>
            )}
            <Field label={t.f.affectsLife}><YesNo value={(d.z_aktivnosti as YN) || ""} onChange={(v) => set("z_aktivnosti", v)} t={t} /></Field>
            <Field label={t.f.lastMens}><input type="date" className={dateInput} value={d.z_zadnja_men ?? ""} onChange={(e) => set("z_zadnja_men", e.target.value)} /></Field>
          </div>
        )}
      </Section>

      {/* ── DIO 3c ── */}
      <Section title={t.sections.s3c} number={5} filled={isSectionFilled("s3c")}>
        <Field label={t.f.secretionYn}><YesNo value={(d.z_sekret_yn as YN) || ""} onChange={(v) => set("z_sekret_yn", v)} t={t} /></Field>
        {d.z_sekret_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Field label={t.f.secretionColor}><input type="text" className={input} value={d.z_sekret_boja ?? ""} onChange={(e) => set("z_sekret_boja", e.target.value)} /></Field>
            <Field label={t.f.secretionSmell}><input type="text" className={input} value={d.z_sekret_miris ?? ""} onChange={(e) => set("z_sekret_miris", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.bleedAfterSex}><YesNo value={(d.z_krv_odnos as YN) || ""} onChange={(v) => set("z_krv_odnos", v)} t={t} /></Field>
        <Field label={t.f.painSex}><YesNo value={(d.z_bol_odnos as YN) || ""} onChange={(v) => set("z_bol_odnos", v)} t={t} /></Field>

        <Field label={t.f.papaYn}><YesNo value={(d.z_papa_yn as YN) || ""} onChange={(v) => set("z_papa_yn", v)} t={t} /></Field>
        {d.z_papa_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Field label={t.f.papaDate}><input type="text" className={input} value={d.z_papa_datum ?? ""} onChange={(e) => set("z_papa_datum", e.target.value)} /></Field>
            <Field label={t.f.papaRegular}><input type="text" className={input} value={d.z_papa_uredan ?? ""} onChange={(e) => set("z_papa_uredan", e.target.value)} /></Field>
            <Field label={t.f.papaAbnorm}><YesNo value={(d.z_papa_abnorm as YN) || ""} onChange={(v) => set("z_papa_abnorm", v)} t={t} /></Field>
          </div>
        )}

        <Field label={t.f.cervixYn}><YesNo value={(d.z_grlić_yn as YN) || ""} onChange={(v) => set("z_grlić_yn", v)} t={t} /></Field>
        {d.z_grlić_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Field label={t.f.cervixWhen}><input type="text" className={input} value={d.z_grlić_kada ?? ""} onChange={(e) => set("z_grlić_kada", e.target.value)} /></Field>
            <Field label={t.f.cervixTreatment}><input type="text" className={input} value={d.z_grlić_tretman ?? ""} onChange={(e) => set("z_grlić_tretman", e.target.value)} /></Field>
          </div>
        )}

        <Field label={t.f.iudYn}><YesNo value={(d.z_spirala_yn as YN) || ""} onChange={(v) => set("z_spirala_yn", v)} t={t} /></Field>
        {d.z_spirala_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Field label={t.f.iudDur}><input type="text" className={input} value={d.z_spirala_trajanje ?? ""} onChange={(e) => set("z_spirala_trajanje", e.target.value)} /></Field>
            <Field label={t.f.iudRemoved}><input type="text" className={input} value={d.z_spirala_uklonjena ?? ""} onChange={(e) => set("z_spirala_uklonjena", e.target.value)} /></Field>
          </div>
        )}

        <Field label={t.f.ocpYn}><YesNo value={(d.z_pilula_yn as YN) || ""} onChange={(v) => set("z_pilula_yn", v)} t={t} /></Field>
        {d.z_pilula_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Field label={t.f.ocpDur}><input type="text" className={input} value={d.z_pilula_trajanje ?? ""} onChange={(e) => set("z_pilula_trajanje", e.target.value)} /></Field>
            <Field label={t.f.ocpStopped}><input type="text" className={input} value={d.z_pilula_prestanak ?? ""} onChange={(e) => set("z_pilula_prestanak", e.target.value)} /></Field>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 mt-3 gap-y-2">
          <Field label={t.f.endometriosis}><YesNo value={(d.z_endometrioza as YN) || ""} onChange={(v) => set("z_endometrioza", v)} t={t} /></Field>
          <Field label={t.f.pcos}><YesNo value={(d.z_pcos as YN) || ""} onChange={(v) => set("z_pcos", v)} t={t} /></Field>
          <Field label={t.f.cysts}><YesNo value={(d.z_ciste as YN) || ""} onChange={(v) => set("z_ciste", v)} t={t} /></Field>
          <Field label={t.f.fibroids}><YesNo value={(d.z_miomi as YN) || ""} onChange={(v) => set("z_miomi", v)} t={t} /></Field>
          <Field label={t.f.polyps}><YesNo value={(d.z_polipi as YN) || ""} onChange={(v) => set("z_polipi", v)} t={t} /></Field>
          <Field label={t.f.cancer}><YesNo value={(d.z_kancer as YN) || ""} onChange={(v) => set("z_kancer", v)} t={t} /></Field>
        </div>
        <Field label={t.f.gynekDetails}><textarea rows={3} className={input + " resize-none"} value={d.z_ginek_detalji ?? ""} onChange={(e) => set("z_ginek_detalji", e.target.value)} /></Field>
        <Field label={t.f.gynekOther}><textarea rows={2} className={input + " resize-none"} value={d.z_ginek_ostalo ?? ""} onChange={(e) => set("z_ginek_ostalo", e.target.value)} /></Field>
      </Section>

      {/* ── DIO 3d ── */}
      <Section title={t.sections.s3d} number={6} filled={isSectionFilled("s3d")}>
        <Field label={t.f.everPregYn}><YesNo value={(d.z_trudnoca_ikad as YN) || ""} onChange={(v) => set("z_trudnoca_ikad", v)} t={t} /></Field>
        {d.z_trudnoca_ikad === "da" && (
          <DynamicTable
            t={t}
            columns={[
              { key: "datum", label: t.f.pregDate, type: "date" },
              { key: "partner", label: t.f.pregPartner, type: "yn" },
              { key: "tip", label: t.f.pregType },
              { key: "porodjaj", label: t.f.pregDelivery },
              { key: "ishod", label: t.f.pregOutcome },
              { key: "ng", label: t.f.pregNG },
            ]}
            rows={zTrudnoce}
            setRows={setZTrudnoce}
            addLabel={t.ui.addRow}
          />
        )}
      </Section>

      {/* ── DIO 3e ── */}
      <Section title={t.sections.s3e} number={7} filled={isSectionFilled("s3e")}>
        <Field label={t.f.artYesYn}><YesNo value={(d.z_art_yn as YN) || ""} onChange={(v) => set("z_art_yn", v)} t={t} /></Field>
        {d.z_art_yn === "da" && (
          <>
            <Field label={t.f.surrogateYn}><YesNo value={(d.z_surogat_yn as YN) || ""} onChange={(v) => set("z_surogat_yn", v)} t={t} /></Field>
            <p className={labelCls + " mt-4"}>{t.groups.detailsTreatments}</p>
            <DynamicTable
              t={t}
              columns={[
                { key: "datum", label: t.f.artDate, type: "date" },
                { key: "tip", label: t.f.artType },
                { key: "protokol", label: t.f.artProtocol },
                { key: "jajne", label: t.f.artEggs },
                { key: "oplodene", label: t.f.artFert },
                { key: "transf", label: t.f.artTransf },
                { key: "genetski", label: t.f.artGenetic, type: "yn" },
                { key: "zamrznuti", label: t.f.artFrozen },
                { key: "ishod", label: t.f.artOutcome },
              ]}
              rows={zArtTretmani}
              setRows={setZArtTretmani}
              addLabel={t.ui.addRow}
            />
          </>
        )}
        <Field label={t.f.fertAnalysisYn}><YesNo value={(d.z_analize_yn as YN) || ""} onChange={(v) => set("z_analize_yn", v)} t={t} /></Field>
        {d.z_analize_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <p className="text-xs text-neutral-500 mb-3">{t.f.fertAnalysisHint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {["FSH", "LH", "AMH", "TSH", "FT4", "UZ dojki", "Ginekološki UZ"].map((analysis) => {
                const k = "z_" + analysis.toLowerCase().replace(/[^a-z]/g, "_").replace(/_+/g, "_");
                return (
                  <Field key={analysis} label={`${analysis} — ${t.f.fertResultHint}`}>
                    <input type="text" className={input} placeholder={t.f.fertExample} value={d[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
                  </Field>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ── DIO 3f ── */}
      <Section title={t.sections.s3f} number={8} filled={isSectionFilled("s3f")}>
        <Field label={t.f.sexProbYn}><YesNo value={(d.z_sex_prob_yn as YN) || ""} onChange={(v) => set("z_sex_prob_yn", v)} t={t} /></Field>
        {d.z_sex_prob_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.sexProbDetails}><textarea rows={2} className={input + " resize-none"} value={d.z_sex_prob_detalji ?? ""} onChange={(e) => set("z_sex_prob_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.stiYn}><YesNo value={(d.z_spb_yn as YN) || ""} onChange={(v) => set("z_spb_yn", v)} t={t} /></Field>
        {d.z_spb_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.stiDetails}><textarea rows={2} className={input + " resize-none"} value={d.z_spb_detalji ?? ""} onChange={(e) => set("z_spb_detalji", e.target.value)} /></Field>
          </div>
        )}
        <p className={labelCls + " mt-4"}>{t.groups.diagnosed}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2">
          {[["z_hepatb", t.f.hepB], ["z_hepatc", t.f.hepC], ["z_hiv", t.f.hiv], ["z_sifilis", t.f.syph]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => set(k!, d[k!] === "da" ? "" : "da")}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-[0.97] ${d[k!] === "da" ? "bg-red-50 border-red-300 text-red-600" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}
            >{lbl}</button>
          ))}
        </div>
        <Field label={t.f.stiOther}><textarea rows={2} className={input + " resize-none"} value={d.z_spb_ostalo ?? ""} onChange={(e) => set("z_spb_ostalo", e.target.value)} /></Field>
      </Section>

      {/* ── DIO 3g ── */}
      <Section title={t.sections.s3g} number={9} filled={isSectionFilled("s3g")}>
        <Field label={t.f.medsYn}><YesNo value={(d.z_med_yn as YN) || ""} onChange={(v) => set("z_med_yn", v)} t={t} /></Field>
        {d.z_med_yn === "da" && (
          <DynamicTable
            t={t}
            columns={[
              { key: "naziv", label: t.f.medName },
              { key: "doza", label: t.f.medDose },
              { key: "ucestalost", label: t.f.medFreq },
            ]}
            rows={zLijekovi}
            setRows={setZLijekovi}
            addLabel={t.ui.addRow}
          />
        )}
      </Section>

      {/* ── DIO 3h ── */}
      <Section title={t.sections.s3h} number={10} filled={isSectionFilled("s3h")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2 mt-2">
          <Field label={t.f.allergyMed}><YesNo value={(d.z_alergija_lijek as YN) || ""} onChange={(v) => set("z_alergija_lijek", v)} t={t} /></Field>
          <Field label={t.f.allergyLatex}><YesNo value={(d.z_alergija_lateks as YN) || ""} onChange={(v) => set("z_alergija_lateks", v)} t={t} /></Field>
          <Field label={t.f.allergyAnesth}><YesNo value={(d.z_alergija_anestetik as YN) || ""} onChange={(v) => set("z_alergija_anestetik", v)} t={t} /></Field>
        </div>
        {(d.z_alergija_lijek === "da" || d.z_alergija_lateks === "da" || d.z_alergija_anestetik === "da") && (
          <Field label={t.f.allergyDetails}><textarea rows={3} className={input + " resize-none"} value={d.z_alergija_detalji ?? ""} onChange={(e) => set("z_alergija_detalji", e.target.value)} /></Field>
        )}
      </Section>

      {/* ── DIO 3i ── */}
      <Section title={t.sections.s3i} number={11} filled={isSectionFilled("s3i")}>
        <Field label={t.f.seriousIllYn}><YesNo value={(d.z_oboljenja_yn as YN) || ""} onChange={(v) => set("z_oboljenja_yn", v)} t={t} /></Field>
        {d.z_oboljenja_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.seriousIllDetails}><textarea rows={2} className={input + " resize-none"} value={d.z_oboljenja_detalji ?? ""} onChange={(e) => set("z_oboljenja_detalji", e.target.value)} /></Field>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
          <Field label={t.f.bruisingEasily}><YesNo value={(d.z_hematom as YN) || ""} onChange={(v) => set("z_hematom", v)} t={t} /></Field>
          <Field label={t.f.bleedingStop}><YesNo value={(d.z_krvarenje_stop as YN) || ""} onChange={(v) => set("z_krvarenje_stop", v)} t={t} /></Field>
        </div>
        <p className={labelCls + " mt-4"}>{t.groups.presentDiseases}</p>
        <DiseaseBlock prefix="z" data={d} set={set} t={t} />
      </Section>

      {/* ── DIO 3j ── */}
      <Section title={t.sections.s3j} number={12} filled={isSectionFilled("s3j")}>
        <Field label={t.f.gynekOpYn}><YesNo value={(d.z_ginek_op_yn as YN) || ""} onChange={(v) => set("z_ginek_op_yn", v)} t={t} /></Field>
        <Field label={t.f.otherOpYn}><YesNo value={(d.z_ostale_op_yn as YN) || ""} onChange={(v) => set("z_ostale_op_yn", v)} t={t} /></Field>
        {(d.z_ginek_op_yn === "da" || d.z_ostale_op_yn === "da") && (
          <DynamicTable
            t={t}
            columns={[
              { key: "procedura", label: t.f.opProcedure },
              { key: "datum", label: t.f.opDate, type: "date" },
              { key: "razlog", label: t.f.opReason },
              { key: "ishod", label: t.f.opOutcome },
            ]}
            rows={zOperacije}
            setRows={setZOperacije}
            addLabel={t.ui.addRow}
          />
        )}
      </Section>

      {/* ── DIO 3k ── */}
      <Section title={t.sections.s3k} number={13} filled={isSectionFilled("s3k")}>
        <Field label={t.f.geneticsYn}><YesNo value={(d.z_genetika_yn as YN) || ""} onChange={(v) => set("z_genetika_yn", v)} t={t} /></Field>
        {d.z_genetika_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.geneticsDetails}><textarea rows={3} className={input + " resize-none"} value={d.z_genetika_detalji ?? ""} onChange={(e) => set("z_genetika_detalji", e.target.value)} /></Field>
          </div>
        )}
      </Section>

      {/* ── DIO 3l ── */}
      <Section title={t.sections.s3l} number={14} filled={isSectionFilled("s3l")}>
        <Field label={t.f.smoker}><YesNo value={(d.z_pusac as YN) || ""} onChange={(v) => set("z_pusac", v)} t={t} /></Field>
        {d.z_pusac === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.cigarettesPerDay}><input type="number" inputMode="numeric" min={1} className={input} value={d.z_cigarete ?? ""} onChange={(e) => set("z_cigarete", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.vaping}><YesNo value={(d.z_vaping as YN) || ""} onChange={(v) => set("z_vaping", v)} t={t} /></Field>
        <Field label={t.f.drugsYn}><YesNo value={(d.z_droge_yn as YN) || ""} onChange={(v) => set("z_droge_yn", v)} t={t} /></Field>
        {d.z_droge_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.drugsDetails}><input type="text" className={input} value={d.z_droge_detalji ?? ""} onChange={(e) => set("z_droge_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.alcohol}><YesNo value={(d.z_alkohol as YN) || ""} onChange={(v) => set("z_alkohol", v)} t={t} /></Field>
        {d.z_alkohol === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.alcoholDrinks}><input type="number" inputMode="numeric" min={1} className={input} value={d.z_alkohol_pica ?? ""} onChange={(e) => set("z_alkohol_pica", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.tattoosYn}><YesNo value={(d.z_tetovaze_yn as YN) || ""} onChange={(v) => set("z_tetovaze_yn", v)} t={t} /></Field>
        {d.z_tetovaze_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.tattoosDetails}><textarea rows={2} className={input + " resize-none"} value={d.z_tetovaze_detalji ?? ""} onChange={(e) => set("z_tetovaze_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.otherInfo}><textarea rows={3} className={input + " resize-none"} value={d.z_ostalo ?? ""} onChange={(e) => set("z_ostalo", e.target.value)} /></Field>
      </Section>

      {/* ═════════ MALE PARTNER DIVIDER ═════════ */}
      <div className="mt-8 mb-2">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">{t.sections.malePartnerDivider}</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>
      </div>

      {/* ── DIO 4a ── */}
      <Section title={t.sections.s4a} number={15} filled={isSectionFilled("s4a")}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 mt-2">
          <Field label={t.f.age}><input type="number" inputMode="numeric" min={18} max={80} className={input} value={d.m_starost ?? ""} onChange={(e) => set("m_starost", e.target.value)} /></Field>
          <Field label={t.f.height}><input type="number" inputMode="numeric" className={input} value={d.m_visina ?? ""} onChange={(e) => set("m_visina", e.target.value)} /></Field>
          <Field label={t.f.weight}><input type="number" inputMode="numeric" className={input} value={d.m_tezina ?? ""} onChange={(e) => set("m_tezina", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
          <Field label={t.f.bloodGroup}>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {["O", "A", "B", "AB"].map((opt) => (
                <button key={opt} type="button" onClick={() => set("m_krv", opt)}
                  className={`min-h-[44px] w-12 rounded-lg text-sm font-bold border transition-all active:scale-[0.97] ${d.m_krv === opt ? "bg-[#e8682a] border-[#e8682a] text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}
                >{opt}</button>
              ))}
            </div>
          </Field>
          <Field label={t.f.rhFactor}>
            <div className="flex gap-2 mt-1.5">
              {[t.opts.positive, t.opts.negative].map((opt) => (
                <button key={opt} type="button" onClick={() => set("m_rh", opt)} className={optBtn(d.m_rh === opt)}>{opt}</button>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* ── DIO 4b ── */}
      <Section title={t.sections.s4b} number={16} filled={isSectionFilled("s4b")}>
        <Field label={t.f.mPregYn}><YesNo value={(d.m_trudnoca_yn as YN) || ""} onChange={(v) => set("m_trudnoca_yn", v)} t={t} /></Field>
        {d.m_trudnoca_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.mPregDetails}><input type="text" className={input} value={d.m_trudnoca_detalji ?? ""} onChange={(e) => set("m_trudnoca_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.mOtherPregYn}><YesNo value={(d.m_druga_yn as YN) || ""} onChange={(v) => set("m_druga_yn", v)} t={t} /></Field>
        {d.m_druga_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.mOtherPregDetails}><input type="text" className={input} value={d.m_druga_detalji ?? ""} onChange={(e) => set("m_druga_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.klomidYn}><YesNo value={(d.m_klomid_yn as YN) || ""} onChange={(v) => set("m_klomid_yn", v)} t={t} /></Field>
        {d.m_klomid_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.klomidDur}><input type="text" className={input} value={d.m_klomid_trajanje ?? ""} onChange={(e) => set("m_klomid_trajanje", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.mArtYn}><YesNo value={(d.m_art_yn as YN) || ""} onChange={(v) => set("m_art_yn", v)} t={t} /></Field>
        {d.m_art_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.mArtDetails}><textarea rows={2} className={input + " resize-none"} value={d.m_art_detalji ?? ""} onChange={(e) => set("m_art_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.erectionYn}><YesNo value={(d.m_erekcija_yn as YN) || ""} onChange={(v) => set("m_erekcija_yn", v)} t={t} /></Field>
        {d.m_erekcija_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.erectionDetails}><textarea rows={2} className={input + " resize-none"} value={d.m_erekcija_detalji ?? ""} onChange={(e) => set("m_erekcija_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.testesYn}><YesNo value={(d.m_testisi_yn as YN) || ""} onChange={(v) => set("m_testisi_yn", v)} t={t} /></Field>
        {d.m_testisi_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.testesDetails}><input type="text" className={input} value={d.m_testisi_detalji ?? ""} onChange={(e) => set("m_testisi_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.mumpsYn}><YesNo value={(d.m_zauske_yn as YN) || ""} onChange={(v) => set("m_zauske_yn", v)} t={t} /></Field>
        {d.m_zauske_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.mumpsEffect}><input type="text" className={input} value={d.m_zauske_uticaj ?? ""} onChange={(e) => set("m_zauske_uticaj", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.pubertyAge}><input type="number" inputMode="numeric" min={8} max={20} className={input} value={d.m_pubertet ?? ""} onChange={(e) => set("m_pubertet", e.target.value)} /></Field>
        <Field label={t.f.saunaYn}><YesNo value={(d.m_sauna_yn as YN) || ""} onChange={(v) => set("m_sauna_yn", v)} t={t} /></Field>
        {d.m_sauna_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.saunaDetails}><input type="text" className={input} value={d.m_sauna_detalji ?? ""} onChange={(e) => set("m_sauna_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.feverYn}><YesNo value={(d.m_groznica_yn as YN) || ""} onChange={(v) => set("m_groznica_yn", v)} t={t} /></Field>
        {d.m_groznica_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.feverDetails}><input type="text" className={input} value={d.m_groznica_detalji ?? ""} onChange={(e) => set("m_groznica_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.steroidsYn}><YesNo value={(d.m_steroidi_yn as YN) || ""} onChange={(v) => set("m_steroidi_yn", v)} t={t} /></Field>
        {d.m_steroidi_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.steroidsDetails}><textarea rows={2} className={input + " resize-none"} value={d.m_steroidi_detalji ?? ""} onChange={(e) => set("m_steroidi_detalji", e.target.value)} /></Field>
          </div>
        )}
      </Section>

      {/* ── DIO 4c ── */}
      <Section title={t.sections.s4c} number={17} filled={isSectionFilled("s4c")}>
        <Field label={t.f.sexFreq}><input type="text" className={input} placeholder={t.f.sexFreqExample} value={d.m_sex_ucestalost ?? ""} onChange={(e) => set("m_sex_ucestalost", e.target.value)} /></Field>
        <Field label={t.f.stiYn}><YesNo value={(d.m_spb_yn as YN) || ""} onChange={(v) => set("m_spb_yn", v)} t={t} /></Field>
        {d.m_spb_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.stiDetails}><textarea rows={2} className={input + " resize-none"} value={d.m_spb_detalji ?? ""} onChange={(e) => set("m_spb_detalji", e.target.value)} /></Field>
          </div>
        )}
        <p className={labelCls + " mt-4"}>{t.groups.diagnosed}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2">
          {[["m_hepatb", t.f.hepB], ["m_hepatc", t.f.hepC], ["m_hiv", t.f.hiv], ["m_sifilis", t.f.syph]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => set(k!, d[k!] === "da" ? "" : "da")}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-[0.97] ${d[k!] === "da" ? "bg-red-50 border-red-300 text-red-600" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}
            >{lbl}</button>
          ))}
        </div>
        <Field label={t.f.stiOther}><textarea rows={2} className={input + " resize-none"} value={d.m_spb_ostalo ?? ""} onChange={(e) => set("m_spb_ostalo", e.target.value)} /></Field>
      </Section>

      {/* ── DIO 4d ── */}
      <Section title={t.sections.s4d} number={18} filled={isSectionFilled("s4d")}>
        <Field label={t.f.medsYn}><YesNo value={(d.m_med_yn as YN) || ""} onChange={(v) => set("m_med_yn", v)} t={t} /></Field>
        {d.m_med_yn === "da" && (
          <DynamicTable
            t={t}
            columns={[
              { key: "naziv", label: t.f.medName },
              { key: "doza", label: t.f.medDose },
              { key: "ucestalost", label: t.f.medFreq },
            ]}
            rows={mLijekovi}
            setRows={setMLijekovi}
            addLabel={t.ui.addRow}
          />
        )}
      </Section>

      {/* ── DIO 4e ── */}
      <Section title={t.sections.s4e} number={19} filled={isSectionFilled("s4e")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2 mt-2">
          <Field label={t.f.allergyMed}><YesNo value={(d.m_alergija_lijek as YN) || ""} onChange={(v) => set("m_alergija_lijek", v)} t={t} /></Field>
          <Field label={t.f.allergyLatex}><YesNo value={(d.m_alergija_lateks as YN) || ""} onChange={(v) => set("m_alergija_lateks", v)} t={t} /></Field>
          <Field label={t.f.allergyAnesth}><YesNo value={(d.m_alergija_anestetik as YN) || ""} onChange={(v) => set("m_alergija_anestetik", v)} t={t} /></Field>
        </div>
        {(d.m_alergija_lijek === "da" || d.m_alergija_lateks === "da" || d.m_alergija_anestetik === "da") && (
          <Field label={t.f.allergyDetails}><textarea rows={3} className={input + " resize-none"} value={d.m_alergija_detalji ?? ""} onChange={(e) => set("m_alergija_detalji", e.target.value)} /></Field>
        )}
      </Section>

      {/* ── DIO 4f ── */}
      <Section title={t.sections.s4f} number={20} filled={isSectionFilled("s4f")}>
        <Field label={t.f.seriousIllYn}><YesNo value={(d.m_oboljenja_yn as YN) || ""} onChange={(v) => set("m_oboljenja_yn", v)} t={t} /></Field>
        {d.m_oboljenja_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.seriousIllDetails}><textarea rows={2} className={input + " resize-none"} value={d.m_oboljenja_detalji ?? ""} onChange={(e) => set("m_oboljenja_detalji", e.target.value)} /></Field>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
          <Field label={t.f.bruisingEasily}><YesNo value={(d.m_hematom as YN) || ""} onChange={(v) => set("m_hematom", v)} t={t} /></Field>
          <Field label={t.f.bleedingStop}><YesNo value={(d.m_krvarenje_stop as YN) || ""} onChange={(v) => set("m_krvarenje_stop", v)} t={t} /></Field>
        </div>
        <p className={labelCls + " mt-4"}>{t.groups.presentDiseases}</p>
        <DiseaseBlock prefix="m" data={d} set={set} t={t} />

        <Field label={t.f.mSurgeryYn}><YesNo value={(d.m_op_yn as YN) || ""} onChange={(v) => set("m_op_yn", v)} t={t} /></Field>
        {d.m_op_yn === "da" && (
          <DynamicTable
            t={t}
            columns={[
              { key: "procedura", label: t.f.opProcedure },
              { key: "datum", label: t.f.opDate, type: "date" },
              { key: "razlog", label: t.f.opReason },
              { key: "ishod", label: t.f.opOutcome },
            ]}
            rows={mOperacije}
            setRows={setMOperacije}
            addLabel={t.ui.addRow}
          />
        )}
      </Section>

      {/* ── DIO 4g ── */}
      <Section title={t.sections.s4g} number={21} filled={isSectionFilled("s4g")}>
        <Field label={t.f.smoker}><YesNo value={(d.m_pusac as YN) || ""} onChange={(v) => set("m_pusac", v)} t={t} /></Field>
        {d.m_pusac === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.cigarettesPerDay}><input type="number" inputMode="numeric" min={1} className={input} value={d.m_cigarete ?? ""} onChange={(e) => set("m_cigarete", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.vaping}><YesNo value={(d.m_vaping as YN) || ""} onChange={(v) => set("m_vaping", v)} t={t} /></Field>
        <Field label={t.f.mDrugsYn}><YesNo value={(d.m_droge_yn as YN) || ""} onChange={(v) => set("m_droge_yn", v)} t={t} /></Field>
        {d.m_droge_yn === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.drugsDetails}><input type="text" className={input} value={d.m_droge_detalji ?? ""} onChange={(e) => set("m_droge_detalji", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.alcohol}><YesNo value={(d.m_alkohol as YN) || ""} onChange={(v) => set("m_alkohol", v)} t={t} /></Field>
        {d.m_alkohol === "da" && (
          <div className="ml-3 pl-3 border-l-2 border-emerald-200 mt-2">
            <Field label={t.f.alcoholDrinks}><input type="number" inputMode="numeric" min={1} className={input} value={d.m_alkohol_pica ?? ""} onChange={(e) => set("m_alkohol_pica", e.target.value)} /></Field>
          </div>
        )}
        <Field label={t.f.otherInfo}><textarea rows={3} className={input + " resize-none"} value={d.m_ostalo ?? ""} onChange={(e) => set("m_ostalo", e.target.value)} /></Field>
      </Section>

      {/* Inline error */}
      {status === "error" && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 mt-4">
          <AlertCircle size={18} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Consent text (visible inline) */}
      <p className="text-xs text-neutral-400 mt-8 mb-4 text-center px-2">{t.ui.consent}</p>

      {/* Desktop submit */}
      <div className="hidden sm:flex pt-2 pb-6 justify-center">
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 rounded-full bg-[#e8682a] px-10 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#c45418] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? (
            <><Loader2 size={18} className="animate-spin" /> {t.ui.submitting}</>
          ) : (
            <><Send size={18} /> {t.ui.submit}</>
          )}
        </button>
      </div>
    </form>

    {/* ── Mobile sticky submit ── */}
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => formRef.current?.requestSubmit()}
        disabled={status === "loading"}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#e8682a] py-3.5 text-sm font-bold text-white shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {status === "loading" ? (
          <><Loader2 size={18} className="animate-spin" /> {t.ui.submitting}</>
        ) : (
          <><Send size={17} /> {t.ui.submit}</>
        )}
      </button>
    </div>
    </>
  );
}
