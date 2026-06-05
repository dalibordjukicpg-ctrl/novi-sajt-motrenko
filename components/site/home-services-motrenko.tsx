"use client";

import Link from "next/link";
import {
  Activity, Baby, Dna, FlaskConical, Gift, Heart,
  Leaf, Microscope, Scan, Shield, Star, Stethoscope,
  TestTube, Users, Zap, Sun,
} from "lucide-react";

import { FadeIn } from "@/components/site/fade-in";
import type { HomeServiceCard } from "@/lib/queries/home-service-cards";
import type { Locale } from "@/lib/i18n";

const ICON_MAP: Record<string, React.ReactNode> = {
  "heart":        <Heart size={22} strokeWidth={1.5} />,
  "baby":         <Baby size={22} strokeWidth={1.5} />,
  "flask-conical":<FlaskConical size={22} strokeWidth={1.5} />,
  "activity":     <Activity size={22} strokeWidth={1.5} />,
  "scan":         <Scan size={22} strokeWidth={1.5} />,
  "stethoscope":  <Stethoscope size={22} strokeWidth={1.5} />,
  "microscope":   <Microscope size={22} strokeWidth={1.5} />,
  "test-tube":    <TestTube size={22} strokeWidth={1.5} />,
  "dna":          <Dna size={22} strokeWidth={1.5} />,
  "gift":         <Gift size={22} strokeWidth={1.5} />,
  "shield":       <Shield size={22} strokeWidth={1.5} />,
  "star":         <Star size={22} strokeWidth={1.5} />,
  "users":        <Users size={22} strokeWidth={1.5} />,
  "zap":          <Zap size={22} strokeWidth={1.5} />,
  "sun":          <Sun size={22} strokeWidth={1.5} />,
  "leaf":         <Leaf size={22} strokeWidth={1.5} />,
};

/** Fallback ikonica ako icon_name nije poznat. */
const FALLBACK_ICONS = [
  <Heart size={22} key="h" strokeWidth={1.5} />,
  <Baby size={22} key="b" strokeWidth={1.5} />,
  <FlaskConical size={22} key="f" strokeWidth={1.5} />,
  <Activity size={22} key="a" strokeWidth={1.5} />,
  <Scan size={22} key="s" strokeWidth={1.5} />,
  <Stethoscope size={22} key="st" strokeWidth={1.5} />,
];

function resolveIcon(iconName: string, index: number): React.ReactNode {
  return ICON_MAP[iconName] ?? FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

type Props = {
  locale: Locale;
  eyebrow: string;
  heading: string;
  lead: string;
  moreLabel: string;
  cards: HomeServiceCard[];
};

export function HomeServicesMotrenko({
  locale,
  eyebrow,
  heading,
  lead,
  moreLabel,
  cards,
}: Props) {
  return (
    <section
      id="usluge"
      className="site-section site-section-scrim relative z-[1] scroll-mt-24 overflow-x-hidden py-section-y"
    >
      <div className="relative mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-16">
        <FadeIn className="mb-8 lg:mb-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center sm:mx-0 sm:text-left">
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <span className="size-1.5 shrink-0 rounded-full bg-site-brand" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-site-brand sm:text-[11px] sm:tracking-[0.28em]">
                {eyebrow}
              </p>
            </div>
            <h2
              style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
              className="text-balance text-[clamp(1.55rem,6.5vw,2.6rem)] font-medium leading-[1.12] tracking-[-0.02em] text-site-ink"
            >
              {heading}
            </h2>
            {lead ? (
              <p className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-site-muted sm:mx-0 sm:text-base">
                {lead}
              </p>
            ) : null}
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {cards.map((card, i) => (
            <FadeIn key={card.id} delay={((i % 3) * 100) as 0 | 100 | 200}>
              <Link
                href={card.href.startsWith("/s/") || card.href.startsWith("#")
                  ? `/${locale}${card.href.startsWith("/s/") ? card.href : card.href}`
                  : card.href}
                className="group site-card-glass relative flex h-full flex-col items-center gap-5 p-6 text-center sm:items-start sm:p-7 sm:text-left"
              >
                {/* Gornji brand accent na hover */}
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[1.25rem] bg-gradient-to-r from-transparent via-site-brand/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex size-11 items-center justify-center rounded-xl bg-site-brand/8 text-site-brand ring-1 ring-site-brand/12 transition-all duration-300 group-hover:bg-site-brand/14 group-hover:scale-105">
                  {resolveIcon(card.iconName, i)}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <p
                    style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
                    className="text-[1rem] font-semibold leading-snug tracking-tight text-site-ink"
                  >
                    {card.title}
                  </p>
                  {card.description ? (
                    <p className="text-[0.8rem] leading-relaxed text-site-muted">
                      {card.description.length > 80
                        ? `${card.description.slice(0, 80)}…`
                        : card.description}
                    </p>
                  ) : null}
                </div>

                <span className="mt-auto inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-site-muted/70 transition-colors duration-300 group-hover:text-site-brand sm:justify-start">
                  {moreLabel}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
