"use client";

import Link from "next/link";
import { Activity, Baby, FlaskConical, Heart, Scan, Stethoscope } from "lucide-react";

import { FadeIn } from "@/components/site/fade-in";
import type { PublicNavItem } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import type { Locale } from "@/lib/i18n";

const ICONS = [
  <Heart size={22} key="heart" strokeWidth={1.5} />,
  <Baby size={22} key="baby" strokeWidth={1.5} />,
  <FlaskConical size={22} key="flask" strokeWidth={1.5} />,
  <Activity size={22} key="activity" strokeWidth={1.5} />,
  <Scan size={22} key="scan" strokeWidth={1.5} />,
  <Stethoscope size={22} key="stethoscope" strokeWidth={1.5} />,
];

type Props = {
  locale: Locale;
  eyebrow: string;
  heading: string;
  lead: string;
  moreLabel: string;
  /** Stubovi ispod „Usluga“ (npr. infertilitet, IUI/IVF…) iz nav stabla. */
  categories: PublicNavItem[];
};

export function HomeServicesMotrenko({
  locale,
  eyebrow,
  heading,
  lead,
  moreLabel,
  categories,
}: Props) {

  return (
    <section
      id="usluge"
      className="site-section site-section-scrim relative z-[1] scroll-mt-24 overflow-x-hidden py-section-y"
    >

      <div className="relative mx-auto max-w-7xl px-6 lg:px-16">
        <FadeIn className="mb-8 lg:mb-10">
          <div className="flex max-w-3xl flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="size-1.5 shrink-0 rounded-full bg-site-brand" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-site-brand">
                {eyebrow}
              </p>
            </div>
            <h2
              style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
              className="text-[clamp(1.8rem,3.2vw,2.6rem)] font-medium leading-[1.1] tracking-[-0.02em] text-site-ink"
            >
              {heading}
            </h2>
            {lead ? (
              <p className="max-w-2xl text-sm leading-relaxed text-site-muted sm:text-base">
                {lead}
              </p>
            ) : null}
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {categories.map((cat, i) => {
            const firstChild = cat.children[0];
            const description = firstChild?.label ?? "";
            return (
              <FadeIn key={cat.id} delay={((i % 3) * 100) as 0 | 100 | 200}>
                <Link
                  href={resolvePublicHref(locale, firstChild?.href ?? cat.href)}
                  className="group site-card-glass relative flex h-full flex-col gap-5 p-6 sm:p-7"
                >
                  {/* Gornji brand accent na hover */}
                  <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[1.25rem] bg-gradient-to-r from-transparent via-site-brand/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="flex size-11 items-center justify-center rounded-xl bg-site-brand/8 text-site-brand ring-1 ring-site-brand/12 transition-all duration-300 group-hover:bg-site-brand/14 group-hover:scale-105">
                    {ICONS[i % ICONS.length]}
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    <p
                      style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
                      className="text-[1rem] font-semibold leading-snug tracking-tight text-site-ink"
                    >
                      {cat.label}
                    </p>
                    {description ? (
                      <p className="text-[0.8rem] leading-relaxed text-site-muted">
                        {description.length > 80 ? `${description.slice(0, 80)}…` : description}
                      </p>
                    ) : null}
                  </div>

                  <span className="mt-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-site-muted/70 transition-colors duration-300 group-hover:text-site-brand">
                    {moreLabel}
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
