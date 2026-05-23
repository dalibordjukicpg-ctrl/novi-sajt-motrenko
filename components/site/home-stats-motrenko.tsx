"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Baby, Heart, Star, Users } from "lucide-react";

import { CLINIC_PAGE_HERO_BG } from "@/lib/clinic-assets";

export type HomeStatItem = {
  valueRaw: string;
  label: string;
  bgImage: string;
  bgPosition?: string;
};

/* Ikone se dodjeljuju po indeksu — da promijenite ikonu, promijenite ovaj niz */
const STAT_ICONS = [
  <Heart size={17} strokeWidth={1.45} fill="currentColor" key="heart" />,
  <Baby size={17} strokeWidth={1.45} key="baby" />,
  <Users size={17} strokeWidth={1.45} key="users" />,
  <Star size={17} strokeWidth={1.45} fill="currentColor" key="star" />,
];

function StatPremiumIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative shrink-0">
      <div
        aria-hidden
        className="absolute -inset-1.5 rounded-full bg-[rgb(232_104_42/0.45)] blur-md"
      />
      <div className="relative flex size-9 items-center justify-center rounded-full border border-white/35 bg-gradient-to-br from-white/30 via-white/12 to-[rgb(232_104_42/0.22)] text-[#fff6ef] shadow-[0_8px_22px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-xl sm:size-10">
        <span className="drop-shadow-[0_1px_6px_rgba(232,104,42,0.55)] [&_svg]:opacity-95">
          {children}
        </span>
      </div>
    </div>
  );
}

function parseStatParts(raw: string): { target: number; suffix: string; displayStatic: string | null } {
  const t = raw.trim();
  if (!t) return { target: 0, suffix: "", displayStatic: "" };
  const pct = t.match(/^(\d[\d.]*)%$/);
  if (pct) {
    const n = parseInt(pct[1].replace(/\./g, ""), 10);
    if (!Number.isNaN(n)) return { target: n, suffix: "%", displayStatic: null };
  }
  const plus = t.match(/^(\d[\d.]*)\+$/);
  if (plus) {
    const n = parseInt(plus[1].replace(/\./g, ""), 10);
    if (!Number.isNaN(n)) return { target: n, suffix: "+", displayStatic: null };
  }
  return { target: 0, suffix: "", displayStatic: t };
}

function useCountUp(target: number, duration = 1800, active: boolean) {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [active, target, duration]);
  return count;
}

function StatCardBg({ src, position }: { src: string; position?: string }) {
  const [useFallback, setUseFallback] = useState(false);
  const effective = useFallback ? CLINIC_PAGE_HERO_BG : src;
  const pos = useFallback ? "center center" : (position ?? "center");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effective}
      alt=""
      className="absolute inset-0 h-full w-full object-cover saturate-[1.08] contrast-[1.04]"
      style={{ objectPosition: pos }}
      onError={() => setUseFallback(true)}
    />
  );
}

function StatItem({ stat, delay, index }: { stat: HomeStatItem; delay: number; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const { target, suffix, displayStatic } = useMemo(
    () => parseStatParts(stat.valueRaw),
    [stat.valueRaw],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const count = useCountUp(target, 1800, vis && displayStatic === null);

  return (
    <div ref={ref} className="h-full">
      <article
        className={[
          "group relative flex h-full min-h-[11.5rem] flex-col overflow-hidden rounded-2xl sm:min-h-[12.5rem] sm:rounded-[1.35rem]",
          "bg-[#241a12] ring-1 ring-white/[0.06] transition-all duration-500 ease-out",
          "shadow-[0_16px_40px_-14px_rgba(28,18,10,0.28)]",
          "hover:-translate-y-1 hover:shadow-[0_24px_52px_-14px_rgba(28,18,10,0.36)] hover:ring-site-brand/30",
          vis ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl sm:rounded-[1.35rem]"
          aria-hidden
        >
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.06]">
            <StatCardBg src={stat.bgImage} position={stat.bgPosition} />
          </div>
          <div className="absolute inset-0 bg-[#1a1208]/[0.08] mix-blend-multiply" />
          <div
            className="absolute inset-0"
            style={{
              background: [
                "linear-gradient(to top, rgba(22,14,8,0.72) 0%, rgba(22,14,8,0.36) 40%, rgba(22,14,8,0.08) 65%, transparent 100%)",
                "linear-gradient(135deg, rgba(232,104,42,0.18) 0%, transparent 45%)",
              ].join(", "),
            }}
          />
        </div>

        <div className="relative z-10 flex min-h-[10.75rem] flex-col justify-end px-3.5 pb-4 pt-3.5 sm:min-h-[12.5rem] sm:px-5 sm:pb-6 sm:pt-5">
          <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
            <StatPremiumIcon>{STAT_ICONS[index % STAT_ICONS.length]}</StatPremiumIcon>
          </div>

          <div className="w-full min-w-0 pr-10 sm:pr-12">
            <div className="flex h-[2rem] w-full items-end sm:h-[2.5rem]">
              <p
                className="w-full min-w-0 text-left text-[1.875rem] font-semibold leading-none tracking-tight text-white tabular-nums sm:text-[2.35rem]"
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  textShadow: "0 2px 24px rgba(0,0,0,0.35)",
                }}
              >
                {displayStatic !== null ? (
                  <span>{displayStatic}</span>
                ) : (
                  <>
                    <span>{count.toLocaleString("sr-Latn-ME")}</span>
                    {suffix ? (
                      <span className="ml-0.5 text-[0.58em] font-semibold leading-none text-[var(--site-peach)]">
                        {suffix}
                      </span>
                    ) : null}
                  </>
                )}
              </p>
            </div>

            <div
              aria-hidden
              className="mt-2.5 h-px w-full bg-gradient-to-r from-white/45 via-white/18 to-transparent sm:mt-3"
            />

            <p className="mt-2.5 min-h-[2.85rem] w-full text-left text-[8.5px] font-semibold uppercase leading-[1.32] tracking-[0.11em] text-white/92 sm:mt-3 sm:min-h-[2.95rem] sm:text-[10px] sm:leading-[1.35] sm:tracking-[0.18em]">
              {stat.label}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

type Props = { items: HomeStatItem[] };

export function HomeStatsMotrenko({ items }: Props) {
  return (
    <section className="site-section site-section-scrim relative z-[1] overflow-x-hidden py-section-y">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {items.map((stat, i) => (
            <StatItem key={`stat-${i}`} stat={stat} delay={i * 100} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
