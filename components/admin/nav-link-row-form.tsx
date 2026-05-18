"use client";

import { useState } from "react";

import { saveNavLinkAction } from "@/app/admin/(authed)/site/actions";
import { translateLabelFromMeAction } from "@/app/admin/(authed)/translate/actions";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

export type PageOption = { slug: string; titleMe: string };

type Props = {
  linkId: string;
  href: string;
  sortOrder: number;
  visible: boolean;
  placement: "header" | "footer";
  footerColumn: number;
  labels: Record<Locale, string>;
  pageOptions: PageOption[];
};

export function NavLinkRowForm({
  linkId,
  href: initialHref,
  sortOrder: initialOrder,
  visible: initialVisible,
  placement,
  footerColumn: initialFooterCol,
  labels: initialLabels,
  pageOptions,
}: Props) {
  const [href, setHref] = useState(initialHref);
  const [linkedSlug, setLinkedSlug] = useState<string>(() => {
    const m = initialHref.trim().match(/^\/s\/([^/?#]+)/);
    return m?.[1] ?? "";
  });
  const [labels, setLabels] = useState<Record<Locale, string>>(initialLabels);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  return (
    <form
      action={saveNavLinkAction}
      className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-4"
    >
      <input type="hidden" name="linkId" value={linkId} />
      <input type="hidden" name="placement" value={placement} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="block min-w-[220px] flex-1 text-sm">
          <span className="font-medium text-neutral-700">Poveži sa stranicom</span>
          <select
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
            value={linkedSlug}
            onChange={(e) => {
              const v = e.target.value;
              setLinkedSlug(v);
              if (v) setHref(`/s/${v}`);
              else setHref("#");
            }}
          >
            <option value="">— ručni URL ispod —</option>
            {pageOptions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.titleMe} ({p.slug})
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[200px] flex-1 text-sm">
          <span className="font-medium text-neutral-700">URL / sidro</span>
          <input
            name="href"
            value={href}
            onChange={(e) => {
              setHref(e.target.value);
              const m = e.target.value.trim().match(/^\/s\/([^/?#]+)/);
              setLinkedSlug(m?.[1] ?? "");
            }}
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
          />
        </label>
        {placement === "footer" ? (
          <label className="block w-32 text-sm">
            <span className="font-medium text-neutral-700">Kolona</span>
            <select
              name="footerColumn"
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
              defaultValue={String(
                initialFooterCol >= 1 && initialFooterCol <= 4
                  ? initialFooterCol
                  : 1,
              )}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="footerColumn" value="0" />
        )}
        <label className="block w-28 text-sm">
          <span className="font-medium text-neutral-700">Redosled</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={initialOrder}
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="visible"
            defaultChecked={initialVisible}
            className="rounded border-neutral-300"
          />
          Vidljivo
        </label>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Sačuvaj stavku
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Stranice: prefiks{" "}
        <code className="rounded bg-neutral-100 px-1">/s/slug</code> na javnom sajtu.
      </p>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-600">Nazivi po jeziku</span>
          <button
            type="button"
            disabled={translating}
            onClick={async () => {
              setTranslateError(null);
              setTranslating(true);
              try {
                const res = await translateLabelFromMeAction(labels.me ?? "");
                if (!res.ok) {
                  setTranslateError(res.error);
                  return;
                }
                setLabels((prev) => ({
                  ...prev,
                  en: res.translations.en,
                  ru: res.translations.ru,
                }));
              } finally {
                setTranslating(false);
              }
            }}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            {translating ? (
              <span className="inline-block size-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
            ) : (
              <span>🌐</span>
            )}
            Prevedi EN/RU
          </button>
        </div>
        {translateError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {translateError}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {locales.map((loc) => (
            <label key={loc} className="block text-sm">
              <span className="font-medium text-neutral-700">
                {loc === "me" ? "ME/SR" : loc.toUpperCase()}
              </span>
              <input
                name={`label_${linkId}_${loc}`}
                value={labels[loc as Locale] ?? ""}
                onChange={(e) =>
                  setLabels((prev) => ({
                    ...prev,
                    [loc]: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}
