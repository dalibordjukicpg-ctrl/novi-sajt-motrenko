"use client";

import { useMemo, useState } from "react";

import {
  createSitePageAction,
  updateSitePageAction,
} from "@/app/admin/(authed)/pages/actions";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import type { MediaOption } from "@/lib/queries/media-admin";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { SITE_PAGE_HEADER_GROUP_OPTIONS } from "@/lib/site-page-header-nav";
import { slugifyTitle } from "@/lib/slugify";

const localeLabels: Record<Locale, string> = {
  me: "MNE",
};

type ByLocale = Record<Locale, { title: string; body: string }>;

type Props = {
  mediaOptions: MediaOption[];
} & (
  | {
      mode: "create";
      initialPublished?: boolean;
    }
  | {
      mode: "edit";
      pageId: string;
      initialSlug: string;
      initialPublished: boolean;
      /** Vrijednost iz SITE_PAGE_HEADER_GROUP_OPTIONS ili null */
      initialHeaderNavGroup: string | null;
      byLocale: ByLocale;
    }
);

export function SitePageFormClient(props: Props) {
  const initialByLocale: ByLocale = useMemo(() => {
    if (props.mode === "edit") return props.byLocale;
    return Object.fromEntries(
      locales.map((loc) => [loc, { title: "", body: "" }]),
    ) as ByLocale;
  }, [props]);

  const [slug, setSlug] = useState(
    props.mode === "edit" ? props.initialSlug : "",
  );
  const [published, setPublished] = useState(
    props.mode === "edit"
      ? props.initialPublished
      : (props.initialPublished ?? true),
  );
  const [titles, setTitles] = useState<Record<Locale, string>>(() => {
    const o = {} as Record<Locale, string>;
    for (const loc of locales) o[loc] = initialByLocale[loc].title;
    return o;
  });
  const [bodies, setBodies] = useState<Record<Locale, string>>(() => {
    const o = {} as Record<Locale, string>;
    for (const loc of locales) o[loc] = initialByLocale[loc].body;
    return o;
  });
  const [tab, setTab] = useState<Locale>("me");

  const action =
    props.mode === "create" ? createSitePageAction : updateSitePageAction;

  function onTitleMeBlur() {
    if (props.mode === "edit") return;
    if (!slug && titles.me.trim()) {
      setSlug(slugifyTitle(titles.me));
    }
  }

  return (
    <form action={action} className="space-y-8">
      {props.mode === "edit" ? (
        <input type="hidden" name="pageId" value={props.pageId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-neutral-700">Slug (URL)</span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.trim().toLowerCase())}
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 font-mono text-sm"
            placeholder="o-nama"
            required
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Javni URL: /…/s/{slug || "slug"}
          </span>
        </label>
        <label className="flex items-center gap-2 pt-7 text-sm">
          <input
            type="hidden"
            name="published"
            value={published ? "on" : "off"}
            readOnly
          />
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-neutral-300"
          />
          Objavljeno
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-neutral-700">
          Grupa u meniju (Usluge)
        </span>
        <select
          name="header_nav_group"
          className="mt-1 w-full max-w-xl rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          defaultValue={
            props.mode === "edit"
              ? (props.initialHeaderNavGroup ?? "")
              : ""
          }
        >
          {SITE_PAGE_HEADER_GROUP_OPTIONS.map((o) => (
            <option key={o.value || "none"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-neutral-500">
          Stranice s grupom pojavljuju se u headeru pod stavkom „Usluge“ — ispod
          odgovarajuće podgrupe (npr. Infertilitet i sterilitet), ako ta stavka
          već postoji u Header i footer.
        </span>
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">
          {locales.length > 1 ? "Jezici — naslov i sadržaj" : "Naslov i sadržaj"}
        </p>
        {locales.length > 1 ? (
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 pb-2">
          {locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setTab(loc)}
              className={
                tab === loc
                  ? "rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white"
                  : "rounded-md px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
              }
            >
              {localeLabels[loc]}
            </button>
          ))}
        </div>
        ) : null}

        {locales.map((loc) => (
          <div key={loc} className={tab === loc ? "mt-4 block space-y-3" : "hidden"}>
            <label className="block text-sm">
              <span className="font-medium text-neutral-700">
                Naslov ({localeLabels[loc]})
              </span>
              <input
                name={loc === "me" ? "title_me" : `title_${loc}`}
                value={titles[loc]}
                onChange={(e) =>
                  setTitles((s) => ({ ...s, [loc]: e.target.value }))
                }
                onBlur={loc === "me" ? onTitleMeBlur : undefined}
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2"
                required={loc === "me"}
              />
            </label>
            <div>
              <span className="text-sm font-medium text-neutral-700">
                Sadržaj ({localeLabels[loc]})
              </span>
              <div className="mt-1">
                {tab === loc ? (
                  <TiptapEditor
                    key={`${props.mode === "edit" ? props.pageId : "new"}-${loc}`}
                    initialHtml={bodies[loc]}
                    mediaOptions={props.mediaOptions}
                    placeholder="Sadržaj stranice…"
                    onHtmlChange={(html) =>
                      setBodies((s) => ({ ...s, [loc]: html }))
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {locales.map((loc) => (
          <input type="hidden" key={`b-${loc}`} name={`body_${loc}`} value={bodies[loc]} />
        ))}
      </div>

      <button
        type="submit"
        className="rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        {props.mode === "create" ? "Kreiraj stranicu" : "Sačuvaj izmjene"}
      </button>
    </form>
  );
}
