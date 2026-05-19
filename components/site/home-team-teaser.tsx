"use client";

import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { resolvePublicHref } from "@/lib/resolve-public-href";

export type HomeTeamHighlightCard = {
  title: string;
  body: string;
  href?: string;
};

export type HomeTeamMember = {
  imageSrc: string;
  name: string;
  role: string;
};

type Props = {
  locale: Locale;
  eyebrow: string;
  title: string;
  lead: string;
  aboutHref: string;
  ctaLabel: string;
  members: HomeTeamMember[];
  /** Kratki tekst ispod fotografije istaknutog člana (npr. dr Motrenko). */
  featuredBio: string;
  highlights: HomeTeamHighlightCard[];
};

function isLocalSrc(src: string) {
  return src.startsWith("/");
}

export function HomeTeamTeaser({
  locale,
  eyebrow,
  title,
  lead,
  aboutHref,
  ctaLabel,
  members,
  featuredBio,
  highlights,
}: Props) {
  const featured = members[0];
  const bio = featuredBio.trim();

  return (
    <section
      id="tim"
      className="site-section site-section-scrim relative z-[1] scroll-mt-24 overflow-x-hidden py-section-y"
    >
      <div className="relative mx-auto max-w-7xl px-6 lg:px-16">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-8 xl:gap-10">
          <div className="mx-auto w-full max-w-[360px] sm:max-w-sm lg:mx-0">
            <article className="site-card-glass-lg overflow-hidden">
              <p className="px-5 pb-0 pt-5 text-[10px] font-semibold uppercase tracking-[0.26em] text-site-brand">
                {eyebrow}
              </p>
              <div className="relative mt-3 aspect-[3/4] bg-site-surface-a">
                {featured && isLocalSrc(featured.imageSrc) ? (
                  <Image
                    src={featured.imageSrc}
                    alt={featured.name || "Dr Tatjana Motrenko Simić"}
                    fill
                    unoptimized
                    sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, (min-width: 640px) 85vw, 92vw"
                    priority
                    className="object-cover object-[center_18%]"
                  />
                ) : featured ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.imageSrc}
                    alt={featured.name || "Dr Tatjana Motrenko Simić"}
                    className="h-full w-full object-cover object-[center_18%]"
                  />
                ) : null}
              </div>
              <div className="px-5 py-4 sm:py-5">
                <h3
                  className="text-lg font-medium leading-snug text-site-ink sm:text-xl"
                  style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
                >
                  {featured?.name}
                </h3>
                <p className="mt-1.5 text-sm font-medium leading-snug text-site-brand-muted">
                  {featured?.role}
                </p>
                {bio ? (
                  <p className="mt-3 pt-3 text-sm leading-relaxed text-site-muted">
                    {bio}
                  </p>
                ) : null}
              </div>
            </article>
          </div>

          <div className="lg:pl-2">
            <h2
              style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
              className="text-[clamp(1.5rem,2.8vw,2.5rem)] font-medium leading-[1.15] tracking-tight text-site-ink"
            >
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-site-muted sm:text-base">
              {lead}
            </p>
            <div className="mt-6 space-y-3">
              {highlights.map((h) => {
                const cardClass =
                  "site-card-glass block px-4 py-3.5 transition sm:px-4 sm:py-4 " +
                  (h.href
                    ? "cursor-pointer hover:border-site-brand/20 hover:shadow-site-card-lg group"
                    : "");

                const inner = (
                  <>
                    <p className="text-sm font-semibold text-site-ink group-hover:text-site-brand">
                      {h.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-site-muted">
                      {h.body}
                    </p>
                    {h.href ? (
                      <span
                        className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-site-brand opacity-80 group-hover:opacity-100"
                        aria-hidden
                      >
                        Pročitajte više →
                      </span>
                    ) : null}
                  </>
                );

                const key = `${h.title}-${h.href ?? "static"}`;
                if (h.href && h.href !== "#") {
                  return (
                    <Link
                      key={key}
                      href={resolvePublicHref(locale, h.href)}
                      className={cardClass}
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <div key={key} className={cardClass}>
                    {inner}
                  </div>
                );
              })}
            </div>
            <Link
              href={resolvePublicHref(locale, aboutHref)}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-site-brand/25 bg-site-card px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-site-brand shadow-site-card transition hover:border-site-brand/45 hover:bg-site-surface-c hover:shadow-site-card-lg sm:px-5 sm:text-[11px]"
            >
              {ctaLabel} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
