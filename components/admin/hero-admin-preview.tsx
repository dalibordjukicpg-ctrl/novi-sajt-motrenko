"use client";

import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import type { SiteStringKey } from "@/lib/site-fields";

type Draft = Record<SiteStringKey, Record<Locale, string>>;

type Props = {
  locale: Locale;
  draft: Draft;
  heroBgUrl: string | null;
};

export function HeroAdminPreview({ locale, draft, heroBgUrl }: Props) {
  const s = (key: SiteStringKey) => draft[key]?.[locale] ?? "";

  return (
    <div className="lg:sticky lg:top-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Pregled hero-a ({locale.toUpperCase()})
      </p>
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-b from-teal-50/90 via-white to-white shadow-sm">
        {heroBgUrl ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url(${heroBgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(13,148,136,0.12), transparent 45%), radial-gradient(circle at 80% 10%, rgba(15,118,110,0.08), transparent 40%)",
          }}
        />
        <div className="relative p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-700/80">
            Podnaslov brenda vidi se u headeru (org.subtitle)
          </p>
          <h2 className="mt-3 font-serif text-2xl font-semibold leading-tight text-slate-900">
            <span className="block">{s("hero.line1")}</span>
            <span className="mt-1 block bg-gradient-to-r from-teal-800 to-teal-600 bg-clip-text text-transparent">
              {s("hero.line2")}
            </span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {s("hero.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white">
              {s("hero.cta_primary")}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800">
              {s("hero.cta_secondary")}
            </span>
          </div>
        </div>
      </div>
      <Link
        href={`/${locale}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-medium text-teal-800 underline hover:text-teal-950"
      >
        Otvori javnu početnu ({locale})
      </Link>
    </div>
  );
}
