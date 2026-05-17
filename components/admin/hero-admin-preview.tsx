"use client";

import Link from "next/link";

import {
  isHeroBackgroundVideoUrl,
  isHeroBackgroundYoutubeUrl,
} from "@/lib/hero-background-media";
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
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-b from-orange-50/95 via-white to-white shadow-sm">
        {heroBgUrl && isHeroBackgroundYoutubeUrl(heroBgUrl) ? (
          <iframe
            title=""
            src={`${heroBgUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${heroBgUrl.split("/embed/")[1] ?? ""}`}
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.4] opacity-30"
            allow="autoplay; encrypted-media"
          />
        ) : heroBgUrl && isHeroBackgroundVideoUrl(heroBgUrl) ? (
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden={true}
          >
            <source src={heroBgUrl} />
          </video>
        ) : heroBgUrl ? (
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
              "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.12), transparent 45%), radial-gradient(circle at 80% 10%, rgba(234,88,12,0.08), transparent 40%)",
          }}
        />
        <div className="relative p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-700/85">
            Podnaslov brenda vidi se u headeru (org.subtitle)
          </p>
          <h2 className="mt-3 font-serif text-2xl font-semibold leading-tight text-slate-900">
            <span className="block">{s("hero.line1")}</span>
            <span className="mt-1 block bg-gradient-to-r from-orange-800 to-orange-600 bg-clip-text text-transparent">
              {s("hero.line2")}
            </span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {s("hero.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white">
              {s("hero.cta_primary")}
            </span>
            <span className="rounded-full border border-orange-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800">
              {s("hero.cta_secondary")}
            </span>
          </div>
        </div>
      </div>
      <Link
        href={`/${locale}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-medium text-orange-800 underline hover:text-orange-950"
      >
        Otvori javnu početnu ({locale})
      </Link>
    </div>
  );
}
