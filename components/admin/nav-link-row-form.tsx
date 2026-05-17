"use client";

import { useState } from "react";

import { saveNavLinkAction } from "@/app/admin/(authed)/site/actions";
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
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {locales.map((loc) => (
          <label key={loc} className="block text-sm">
            <span className="font-medium text-neutral-700">Naziv ({loc})</span>
            <input
              name={`label_${linkId}_${loc}`}
              defaultValue={initialLabels[loc as Locale]}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
            />
          </label>
        ))}
      </div>
    </form>
  );
}
