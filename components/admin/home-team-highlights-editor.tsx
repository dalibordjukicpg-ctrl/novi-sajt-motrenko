"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addTeamHighlightAction,
  deleteTeamHighlightAction,
  moveTeamHighlightAction,
  saveTeamHighlightAction,
} from "@/app/admin/(authed)/content/team-highlights/actions";
import { TeamHighlightPageEditor } from "@/components/admin/team-highlight-page-editor";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import type { HomeTeamHighlightAdmin } from "@/lib/queries/home-team-highlights";
import type { MediaOption } from "@/lib/queries/media-admin";
import type { SitePageAdminDetail } from "@/lib/queries/site-pages-admin";
import { slugFromTeamHighlightHref } from "@/lib/team-highlight-href";

const LOCALE_TABS = [
  { key: "me" as const, label: "ME" },
  { key: "en" as const, label: "EN" },
  { key: "ru" as const, label: "RU" },
];

function HighlightRow({
  item,
  linkedPage,
  mediaOptions,
  isFirst,
  isLast,
  onRefresh,
}: {
  item: HomeTeamHighlightAdmin;
  linkedPage: SitePageAdminDetail | null;
  mediaOptions: MediaOption[];
  isFirst: boolean;
  isLast: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeLocale, setActiveLocale] = useState<Locale>("me");
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null);
  const [local, setLocal] = useState(item);

  function setTrans(loc: Locale, field: "title" | "teaser", val: string) {
    setLocal((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [loc]: { ...prev.translations[loc], [field]: val },
      },
    }));
  }

  function save() {
    const fd = new FormData();
    fd.set("highlightId", local.id);
    fd.set("href", local.href);
    fd.set("visible", local.visible ? "1" : "0");
    for (const loc of locales) {
      fd.set(`title_${loc}`, local.translations[loc]?.title ?? "");
      fd.set(`teaser_${loc}`, local.translations[loc]?.teaser ?? "");
    }
    startTransition(async () => {
      setBanner(null);
      const res = await saveTeamHighlightAction(fd);
      setBanner({ ok: res.ok, msg: res.ok ? "Sačuvano." : (res.error ?? "Greška.") });
    });
  }

  function move(dir: "up" | "down") {
    const fd = new FormData();
    fd.set("highlightId", item.id);
    fd.set("direction", dir);
    startTransition(async () => {
      await moveTeamHighlightAction(fd);
      onRefresh();
    });
  }

  function del() {
    if (!confirm("Obrisati ovu karticu?")) return;
    const fd = new FormData();
    fd.set("highlightId", item.id);
    startTransition(async () => {
      await deleteTeamHighlightAction(fd);
      onRefresh();
    });
  }

  const titleMe = local.translations.me?.title || "(bez naslova)";
  const slug = slugFromTeamHighlightHref(local.href);

  return (
    <div className="rounded-xl border border-[#f0e6dc] bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            disabled={isFirst || pending}
            onClick={() => move("up")}
            className="rounded px-1.5 py-0.5 text-xs text-[#6b5f54] hover:bg-[#fff0e6] disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={isLast || pending}
            onClick={() => move("down")}
            className="rounded px-1.5 py-0.5 text-xs text-[#6b5f54] hover:bg-[#fff0e6] disabled:opacity-30"
          >
            ↓
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[#2a2118]">{titleMe}</p>
          <p className="mt-0.5 truncate text-xs text-[#8a7b6e]">{local.href}</p>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-[#6b5f54] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={local.visible}
            onChange={(e) => setLocal((p) => ({ ...p, visible: e.target.checked }))}
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

      {expanded && (
        <div className="border-t border-[#f5ece3] px-4 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#5c4f44] mb-1">
              Link na stranicu (href)
            </label>
            <input
              type="text"
              value={local.href}
              onChange={(e) => setLocal((p) => ({ ...p, href: e.target.value }))}
              placeholder="/s/tim-individualan-pristup"
              className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/30"
            />
            <p className="mt-1.5 text-xs text-[#8a7b6e]">
              Kratki tekst za karticu. Pun sadržaj sa slikama — editor ispod.
              {slug ? (
                <>
                  {" "}
                  Slug: <code className="text-[#5c4f44]">{slug}</code>
                </>
              ) : null}
            </p>
          </div>

          <div>
            <div className="flex gap-1 mb-3">
              {LOCALE_TABS.map((l) => (
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
                  Naslov na kartici ({activeLocale.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={local.translations[activeLocale]?.title ?? ""}
                  onChange={(e) => setTrans(activeLocale, "title", e.target.value)}
                  className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5c4f44] mb-1">
                  Kratki tekst na kartici ({activeLocale.toUpperCase()})
                </label>
                <textarea
                  rows={2}
                  value={local.translations[activeLocale]?.teaser ?? ""}
                  onChange={(e) => setTrans(activeLocale, "teaser", e.target.value)}
                  className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/30"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
            >
              {pending ? "Čuvanje…" : "Sačuvaj"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={del}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Obriši
            </button>
            {banner ? (
              <span
                className={`text-sm ${banner.ok ? "text-emerald-700" : "text-red-700"}`}
              >
                {banner.msg}
              </span>
            ) : null}
          </div>

          <TeamHighlightPageEditor
            key={`${local.id}-page-${linkedPage?.id ?? "none"}`}
            highlightId={local.id}
            cardTitleMe={local.translations.me?.title ?? ""}
            href={local.href}
            page={linkedPage}
            mediaOptions={mediaOptions}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}

export function HomeTeamHighlightsEditor({
  initialItems,
  linkedPagesByHighlightId,
  mediaOptions,
}: {
  initialItems: HomeTeamHighlightAdmin[];
  linkedPagesByHighlightId: Record<string, SitePageAdminDetail | null>;
  mediaOptions: MediaOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function add() {
    startTransition(async () => {
      await addTeamHighlightAction();
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6b5f54]">
        Kartice desno u bloku tima. Za svaku karticu: kratki tekst ovdje, a pun sadržaj sa
        slikama u editoru ispod (Tiptap — isto kao Stranice CMS).
      </p>

      {initialItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#eadfce] bg-[#fffbf7] px-4 py-3 text-sm text-[#6b5f54]">
          Nema kartica. Pokrenite{" "}
          <code className="text-xs">npm run seed:team-highlights</code> ili dodajte karticu.
        </p>
      ) : (
        <div className="space-y-3">
          {initialItems.map((item, i) => (
            <HighlightRow
              key={item.id}
              item={item}
              linkedPage={linkedPagesByHighlightId[item.id] ?? null}
              mediaOptions={mediaOptions}
              isFirst={i === 0}
              isLast={i === initialItems.length - 1}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={add}
        className="rounded-lg border border-[#eadfce] bg-white px-4 py-2 text-sm font-medium text-[#5c4f44] hover:bg-[#fff9f5] disabled:opacity-60"
      >
        + Dodaj karticu
      </button>
    </div>
  );
}
