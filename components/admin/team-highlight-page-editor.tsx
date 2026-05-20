"use client";

import { useRef, useState, useTransition } from "react";

import {
  createTeamHighlightLinkedPageAction,
  saveTeamHighlightLinkedPageAction,
} from "@/app/admin/(authed)/content/team-highlights/actions";
import { translateAndSaveSitePageByIdAction } from "@/app/admin/(authed)/translate/actions";
import type { TiptapEditorHandle } from "@/components/admin/tiptap-editor";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { TranslateFromMeButton } from "@/components/admin/translate-from-me-button";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import type { MediaOption } from "@/lib/queries/media-admin";
import type { SitePageAdminDetail } from "@/lib/queries/site-pages-admin";
import {
  slugFromTeamHighlightHref,
  suggestTeamHighlightPageSlug,
} from "@/lib/team-highlight-href";

const LOCALE_LABELS: Record<Locale, string> = {
  me: "ME/SR",
  en: "EN",
  ru: "RU",
};

type Props = {
  highlightId: string;
  cardTitleMe: string;
  href: string;
  page: SitePageAdminDetail | null;
  mediaOptions: MediaOption[];
  onRefresh: () => void;
};

export function TeamHighlightPageEditor({
  highlightId,
  cardTitleMe,
  href,
  page,
  mediaOptions,
  onRefresh,
}: Props) {
  const [tab, setTab] = useState<Locale>("me");
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null);
  const meEditorRef = useRef<TiptapEditorHandle>(null);

  const [titles, setTitles] = useState<Record<Locale, string>>(() => {
    const o = {} as Record<Locale, string>;
    for (const loc of locales) {
      o[loc] = page?.byLocale[loc]?.title ?? (loc === "me" ? cardTitleMe : "");
    }
    return o;
  });

  const [bodies, setBodies] = useState<Record<Locale, string>>(() => {
    const o = {} as Record<Locale, string>;
    for (const loc of locales) {
      o[loc] = page?.byLocale[loc]?.body ?? "";
    }
    return o;
  });

  const slugFromLink = slugFromTeamHighlightHref(href);
  const [newSlug, setNewSlug] = useState(
    () => slugFromLink ?? suggestTeamHighlightPageSlug(cardTitleMe),
  );

  function savePage() {
    if (!page) return;
    const fd = new FormData();
    fd.set("pageId", page.id);
    for (const loc of locales) {
      fd.set(loc === "me" ? "title_me" : `title_${loc}`, titles[loc]);
      const body =
        loc === "me" ? (meEditorRef.current?.getHtml() ?? bodies[loc]) : bodies[loc];
      fd.set(`body_${loc}`, body);
    }
    startTransition(async () => {
      setBanner(null);
      const res = await saveTeamHighlightLinkedPageAction(fd);
      setBanner({
        ok: res.ok,
        msg: res.ok ? "Sadržaj stranice sačuvan." : (res.error ?? "Greška."),
      });
      if (res.ok) onRefresh();
    });
  }

  function createPage() {
    const fd = new FormData();
    fd.set("highlightId", highlightId);
    fd.set("slug", newSlug.trim().toLowerCase());
    fd.set("title_me", titles.me.trim() || cardTitleMe);
    fd.set("href", href);
    startTransition(async () => {
      setBanner(null);
      const res = await createTeamHighlightLinkedPageAction(fd);
      setBanner({
        ok: res.ok,
        msg: res.ok
          ? "Stranica kreirana. Sada možete dodati tekst i slike."
          : (res.error ?? "Greška."),
      });
      if (res.ok) onRefresh();
    });
  }

  if (!page) {
    return (
      <div className="rounded-lg border border-dashed border-[#eadfce] bg-[#fffbf7] p-4 space-y-3">
        <p className="text-sm font-medium text-[#2a2118]">
          Sadržaj stranice (pun tekst + slike)
        </p>
        <p className="text-xs text-[#6b5f54]">
          Za ovu karticu još nema CMS stranice. Unesite slug i kreirajte stranicu — zatim
          uređujte tekst, slike i raspored ovdje (isti editor kao u Stranicama CMS).
        </p>
        <label className="block text-xs font-medium text-[#5c4f44]">
          Slug stranice
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#eadfce] px-3 py-2 font-mono text-sm"
            placeholder="tim-individualan-pristup"
          />
        </label>
        <p className="text-xs text-[#8a7b6e]">
          Link kartice postat će: <code className="text-[#5c4f44]">/s/{newSlug || "…"}</code>
        </p>
        <button
          type="button"
          disabled={pending || !newSlug.trim()}
          onClick={createPage}
          className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
        >
          {pending ? "Kreiranje…" : "Kreiraj stranicu za ovu karticu"}
        </button>
        {banner ? (
          <p className={`text-sm ${banner.ok ? "text-emerald-700" : "text-red-700"}`}>
            {banner.msg}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#eadfce] bg-[#fffbf7] p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[#2a2118]">
            Sadržaj stranice (pun tekst + slike)
          </p>
          <p className="mt-0.5 font-mono text-xs text-[#8a7b6e]">/s/{page.slug}</p>
        </div>
        <p className="text-xs text-[#6b5f54]">
          U toolbaru: naslovi, liste, <strong>slika</strong> iz Medija ili upload.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[#eadfce] pb-2">
        {locales.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setTab(loc)}
            className={[
              "rounded-md px-3 py-1 text-xs font-semibold transition",
              tab === loc
                ? "bg-[#f37021] text-white"
                : "bg-white text-[#6b5f54] hover:bg-[#f5ece3]",
            ].join(" ")}
          >
            {LOCALE_LABELS[loc]}
          </button>
        ))}
      </div>

      {locales.map((loc) => (
        <div
          key={loc}
          className={tab === loc ? "space-y-3" : "hidden"}
          aria-hidden={tab !== loc}
        >
          <label className="block text-xs font-medium text-[#5c4f44]">
            Naslov stranice ({LOCALE_LABELS[loc]})
            <input
              type="text"
              value={titles[loc]}
              onChange={(e) =>
                setTitles((s) => ({ ...s, [loc]: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm"
            />
          </label>
          <div>
            <span className="text-xs font-medium text-[#5c4f44]">
              Sadržaj ({LOCALE_LABELS[loc]})
            </span>
            <div className="mt-1 rounded-lg border border-[#eadfce] bg-white">
              <TiptapEditor
                ref={loc === "me" ? meEditorRef : undefined}
                key={`${page.id}-${loc}`}
                initialHtml={bodies[loc]}
                mediaOptions={mediaOptions}
                placeholder="Tekst, podnaslovi, slike…"
                onHtmlChange={(html) =>
                  setBodies((s) => ({ ...s, [loc]: html }))
                }
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={savePage}
          className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
        >
          {pending ? "Čuvanje…" : "Sačuvaj sadržaj stranice"}
        </button>
        <TranslateFromMeButton
          disabled={pending}
          label="Prevedi stranicu EN/RU"
          pendingLabel="Prevodim…"
          className="[&_button]:border-[#c7d9f5] [&_button]:bg-[#eef4ff] [&_button]:text-[#1e3a6e] [&_button]:hover:bg-[#e3edff]"
          onGenerate={async () => {
            const fd = new FormData();
            fd.set("pageId", page.id);
            for (const loc of locales) {
              fd.set(loc === "me" ? "title_me" : `title_${loc}`, titles[loc]);
              const body =
                loc === "me"
                  ? (meEditorRef.current?.getHtml() ?? bodies[loc])
                  : bodies[loc];
              fd.set(`body_${loc}`, body);
            }
            const saveRes = await saveTeamHighlightLinkedPageAction(fd);
            if (!saveRes.ok) {
              return { error: saveRes.error ?? "Čuvanje prije prevoda nije uspjelo." };
            }

            const res = await translateAndSaveSitePageByIdAction(page.id);
            if (!res.ok) return { error: res.error };
            onRefresh();
          }}
        />
        {banner ? (
          <span className={`text-sm ${banner.ok ? "text-emerald-700" : "text-red-700"}`}>
            {banner.msg}
          </span>
        ) : null}
      </div>
    </div>
  );
}
