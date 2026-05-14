"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { saveSiteStringGroupAction } from "@/app/admin/(authed)/content/site-content-actions";
import type { SiteStringMatrix } from "@/lib/admin/build-site-matrix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  SITE_STRING_GROUPS,
  SITE_STRING_LABELS,
  type SiteStringGroupId,
  type SiteStringKey,
} from "@/lib/site-fields";

const LOCALE_TAB_LABEL: Record<Locale, string> = {
  me: "MNE",
  en: "EN",
  ru: "RU",
  tr: "TR",
};

function initDraft(
  matrix: SiteStringMatrix,
  group: SiteStringGroupId,
): Record<SiteStringKey, Record<Locale, string>> {
  const keys = SITE_STRING_GROUPS[group];
  const d = {} as Record<SiteStringKey, Record<Locale, string>>;
  for (const k of keys) {
    d[k] = { ...matrix[k] };
  }
  return d;
}

export type TabbedSiteStringsFormProps = {
  group: SiteStringGroupId;
  matrix: SiteStringMatrix;
  /** Desna kolona (npr. dodatni UI). */
  children?: React.ReactNode;
  className?: string;
  preview?: (ctx: {
    draft: Record<SiteStringKey, Record<Locale, string>>;
    activeLocale: Locale;
  }) => React.ReactNode;
};

export function TabbedSiteStringsForm({
  group,
  matrix,
  children,
  className,
  preview,
}: TabbedSiteStringsFormProps) {
  const keys = SITE_STRING_GROUPS[group];
  const router = useRouter();
  const [draft, setDraft] = useState(() => initDraft(matrix, group));
  const [activeLocale, setActiveLocale] = useState<Locale>(locales[0]);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(initDraft(matrix, group));
  }, [matrix, group]);

  const previewNode = useMemo(
    () => (preview ? preview({ draft, activeLocale }) : null),
    [preview, draft, activeLocale],
  );

  return (
    <div className={cn("grid gap-8 lg:grid-cols-2", className)}>
      <div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.set("_group", group);
            for (const k of keys) {
              for (const loc of locales) {
                fd.set(`${loc}::${k}`, draft[k][loc]);
              }
            }
            startTransition(async () => {
              setMsg(null);
              const res = await saveSiteStringGroupAction(fd);
              setMsg(res);
              if (res.ok) router.refresh();
            });
          }}
        >
          {msg?.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
              {msg.error}
            </p>
          )}
          {msg?.ok && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
              Sačuvano. Javni sajt je osvježen.
            </p>
          )}

          <Tabs
            value={activeLocale}
            onValueChange={(v) => {
              if (locales.includes(v as Locale)) setActiveLocale(v as Locale);
            }}
            className="w-full"
          >
            <TabsList className="flex h-auto min-h-10 w-full flex-wrap">
              {locales.map((loc) => (
                <TabsTrigger key={loc} value={loc} className="flex-1">
                  {LOCALE_TAB_LABEL[loc]}
                </TabsTrigger>
              ))}
            </TabsList>
            {locales.map((loc) => (
              <TabsContent key={loc} value={loc} className="space-y-4">
                {keys.map((key) => (
                  <label key={key} className="block text-sm">
                    <span className="font-medium text-neutral-700">
                      {SITE_STRING_LABELS[key]}
                    </span>
                    <span className="ml-2 font-mono text-xs text-neutral-400">
                      {key}
                    </span>
                    <textarea
                      name={`${loc}::${key}`}
                      rows={key.startsWith("social.") ? 2 : 4}
                      value={draft[key][loc]}
                      onChange={(ev) => {
                        setDraft((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], [loc]: ev.target.value },
                        }));
                      }}
                      className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-neutral-800 focus:ring-1 focus:ring-neutral-800"
                    />
                  </label>
                ))}
              </TabsContent>
            ))}
          </Tabs>

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {pending ? "Čuva se…" : "Sačuvaj"}
          </button>
        </form>
      </div>
      <div className="min-h-[120px] space-y-4">
        {previewNode}
        {children}
      </div>
    </div>
  );
}
