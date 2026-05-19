"use client";

import { useState, useTransition } from "react";
import {
  Activity, Baby, Dna, FlaskConical, Gift, Heart,
  Leaf, Microscope, Scan, Shield, Star, Stethoscope,
  TestTube, Users, Zap, Sun,
} from "lucide-react";

import {
  addCardAction,
  deleteCardAction,
  moveCardAction,
  saveCardAction,
} from "@/app/admin/(authed)/content/home-cards/actions";
import type { HomeServiceCardAdmin } from "@/lib/queries/home-service-cards";

const LOCALES = [
  { key: "me", label: "ME" },
  { key: "en", label: "EN" },
  { key: "ru", label: "RU" },
  { key: "tr", label: "TR" },
] as const;

const ICON_OPTIONS = [
  { name: "heart", Icon: Heart, label: "Srce" },
  { name: "baby", Icon: Baby, label: "Beba" },
  { name: "flask-conical", Icon: FlaskConical, label: "Epruveta" },
  { name: "activity", Icon: Activity, label: "Aktivnost" },
  { name: "scan", Icon: Scan, label: "Sken" },
  { name: "stethoscope", Icon: Stethoscope, label: "Stetoskop" },
  { name: "microscope", Icon: Microscope, label: "Mikroskop" },
  { name: "test-tube", Icon: TestTube, label: "Test-epruveta" },
  { name: "dna", Icon: Dna, label: "DNK" },
  { name: "gift", Icon: Gift, label: "Poklon" },
  { name: "shield", Icon: Shield, label: "Štit" },
  { name: "star", Icon: Star, label: "Zvijezda" },
  { name: "users", Icon: Users, label: "Korisnici" },
  { name: "zap", Icon: Zap, label: "Munja" },
  { name: "sun", Icon: Sun, label: "Sunce" },
  { name: "leaf", Icon: Leaf, label: "List" },
] as const;

type IconName = typeof ICON_OPTIONS[number]["name"];

function IconPreview({ name, size = 18 }: { name: string; size?: number }) {
  const found = ICON_OPTIONS.find((o) => o.name === name);
  if (!found) return <Heart size={size} />;
  const { Icon } = found;
  return <Icon size={size} strokeWidth={1.6} />;
}

type Locale = "me" | "en" | "ru" | "tr";

function CardRow({
  card,
  isFirst,
  isLast,
  onRefresh,
}: {
  card: HomeServiceCardAdmin;
  isFirst: boolean;
  isLast: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeLocale, setActiveLocale] = useState<Locale>("me");
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null);

  const [localCard, setLocalCard] = useState<HomeServiceCardAdmin>(card);

  function setTrans(loc: Locale, field: "title" | "description", val: string) {
    setLocalCard((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [loc]: { ...prev.translations[loc], [field]: val },
      },
    }));
  }

  function save() {
    const fd = new FormData();
    fd.set("cardId", localCard.id);
    fd.set("href", localCard.href);
    fd.set("iconName", localCard.iconName);
    fd.set("visible", localCard.visible ? "1" : "0");
    for (const loc of (["me", "en", "ru", "tr"] as Locale[])) {
      fd.set(`title_${loc}`, localCard.translations[loc]?.title ?? "");
      fd.set(`description_${loc}`, localCard.translations[loc]?.description ?? "");
    }
    startTransition(async () => {
      setBanner(null);
      const res = await saveCardAction(fd);
      setBanner({ ok: res.ok, msg: res.ok ? "Sačuvano." : (res.error ?? "Greška.") });
    });
  }

  function move(dir: "up" | "down") {
    const fd = new FormData();
    fd.set("cardId", card.id);
    fd.set("direction", dir);
    startTransition(async () => {
      await moveCardAction(fd);
      onRefresh();
    });
  }

  function del() {
    if (!confirm("Obrisati ovu karticu? Ovo se ne može poništiti.")) return;
    const fd = new FormData();
    fd.set("cardId", card.id);
    startTransition(async () => {
      await deleteCardAction(fd);
      onRefresh();
    });
  }

  const titleMe = localCard.translations.me?.title || "(bez naslova)";

  return (
    <div className="rounded-xl border border-[#f0e6dc] bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            disabled={isFirst || pending}
            onClick={() => move("up")}
            className="rounded px-1.5 py-0.5 text-xs text-[#6b5f54] hover:bg-[#fff0e6] disabled:opacity-30"
            title="Pomjeri gore"
          >↑</button>
          <button
            type="button"
            disabled={isLast || pending}
            onClick={() => move("down")}
            className="rounded px-1.5 py-0.5 text-xs text-[#6b5f54] hover:bg-[#fff0e6] disabled:opacity-30"
            title="Pomjeri dole"
          >↓</button>
        </div>

        {/* Icon preview */}
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff5ef] text-[#f37021]">
          <IconPreview name={localCard.iconName} size={18} />
        </span>

        {/* Title + visible badge */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[#2a2118]">{titleMe}</p>
          <p className="mt-0.5 truncate text-xs text-[#8a7b6e]">{localCard.href}</p>
        </div>

        {/* Visible toggle + expand */}
        <label className="flex items-center gap-1.5 text-xs text-[#6b5f54] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={localCard.visible}
            onChange={(e) => setLocalCard((p) => ({ ...p, visible: e.target.checked }))}
            className="h-3.5 w-3.5 accent-[#f37021]"
          />
          Vidljiva
        </label>

        <button
          type="button"
          onClick={() => setExpanded((o) => !o)}
          className="rounded-lg border border-[#eadfce] bg-white px-3 py-1.5 text-xs font-medium text-[#5c4f44] hover:bg-[#fff9f5]"
        >
          {expanded ? "Zatvori" : "Uredi"}
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-[#f5ece3] px-4 py-4 space-y-4">
          {/* Href + icon row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-[#5c4f44] mb-1">
                Link (href)
              </label>
              <input
                type="text"
                value={localCard.href}
                onChange={(e) => setLocalCard((p) => ({ ...p, href: e.target.value }))}
                placeholder="/s/iui ili #usluge"
                className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/30"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-[#5c4f44] mb-1">Ikonica</label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    title={opt.label}
                    onClick={() => setLocalCard((p) => ({ ...p, iconName: opt.name }))}
                    className={[
                      "flex size-9 items-center justify-center rounded-lg border transition",
                      localCard.iconName === opt.name
                        ? "border-[#f37021] bg-[#fff5ef] text-[#f37021]"
                        : "border-[#eadfce] bg-white text-[#8a7b6e] hover:border-[#f37021]/50 hover:text-[#f37021]",
                    ].join(" ")}
                  >
                    <opt.Icon size={16} strokeWidth={1.6} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Language tabs */}
          <div>
            <div className="flex gap-1 mb-3">
              {LOCALES.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setActiveLocale(l.key)}
                  className={[
                    "rounded-md px-3 py-1 text-xs font-semibold transition",
                    activeLocale === l.key
                      ? "bg-[#f37021] text-white"
                      : "bg-[#faf5f0] text-[#6b5f54] hover:bg-[#f5ece3]",
                  ].join(" ")}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5c4f44] mb-1">
                  Naslov ({activeLocale.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={localCard.translations[activeLocale]?.title ?? ""}
                  onChange={(e) => setTrans(activeLocale, "title", e.target.value)}
                  className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/30"
                  placeholder="Naslov kartice"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5c4f44] mb-1">
                  Kratki opis ({activeLocale.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={localCard.translations[activeLocale]?.description ?? ""}
                  onChange={(e) => setTrans(activeLocale, "description", e.target.value)}
                  className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/30"
                  placeholder="Jedan red opisa (max ~80 znakova)"
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-[#f37021] px-5 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
            >
              {pending ? "Čuvam…" : "Sačuvaj"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={del}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              Obriši
            </button>
            {banner && (
              <span className={["text-sm", banner.ok ? "text-green-700" : "text-red-600"].join(" ")}>
                {banner.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddCardForm({ onAdded }: { onAdded: () => void }) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  function submit() {
    const fd = new FormData();
    fd.set("title_me", title.trim() || "Nova kartica");
    startTransition(async () => {
      await addCardAction(fd);
      setTitle("");
      onAdded();
    });
  }

  return (
    <div className="flex gap-2 pt-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Naslov nove kartice (ME)…"
        className="flex-1 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/30"
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? "…" : "+ Dodaj karticu"}
      </button>
    </div>
  );
}

export function HomeServiceCardsEditor({
  initialCards,
}: {
  initialCards: HomeServiceCardAdmin[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    setRefreshKey((k) => k + 1);
    // Server component will rerender on next navigation; for now just re-fetch
    // The page has force-dynamic so refresh() triggers router.refresh() in practice.
    // We'll trigger a full reload via window.location since we have no router here.
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#6b5f54] mb-4">
        Kartice se prikazuju u gridu od 3 kolone na početnoj stranici. Preporučen broj: 6 (popunjava 2 reda).
      </p>

      {cards.map((card, i) => (
        <CardRow
          key={`${card.id}-${refreshKey}`}
          card={card}
          isFirst={i === 0}
          isLast={i === cards.length - 1}
          onRefresh={refresh}
        />
      ))}

      <AddCardForm onAdded={refresh} />
    </div>
  );
}
