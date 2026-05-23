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
  <Heart size={18} strokeWidth={1.6} key="heart" />,
  <Baby size={18} strokeWidth={1.6} key="baby" />,
  <Users size={18} strokeWidth={1.6} key="users" />,
  <Star size={18} strokeWidth={1.6} key="star" />,
];

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
        style={{ transitionDelay: `${delay}ms`, containerType: "inline-size" }}
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

        <div className="relative z-10 flex min-h-[11rem] w-full min-w-0 flex-col px-4 pb-5 pt-4 sm:min-h-[12.5rem] sm:px-6 sm:pb-7 sm:pt-6">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-site-brand/35 bg-site-brand/[0.15] text-[var(--site-peach)] shadow-[0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-md sm:size-10">
            {STAT_ICONS[index % STAT_ICONS.length]}
          </div>

          <div className="min-h-2 flex-1" aria-hidden />

          <div className="mt-auto w-full min-w-0 text-left">
            <p
              className="min-h-[2rem] w-full min-w-0 text-[clamp(1.2rem,14cqw,2.65rem)] font-semibold leading-none tracking-tight text-white tabular-nums sm:min-h-[2.65rem]"
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                textShadow: "0 2px 24px rgba(0,0,0,0.35)",
              }}
            >
              <span className="inline-block max-w-full leading-none">
                {displayStatic !== null ? (
                  <span>{displayStatic}</span>
                ) : (
                  <>
                    <span>{count.toLocaleString("sr-Latn-ME")}</span>
                    {suffix ? (
                      <span className="ml-px text-[0.62em] font-semibold leading-none text-[var(--site-peach)]">
                        {suffix}
                      </span>
                    ) : null}
                  </>
                )}
              </span>
            </p>

            <div className="mt-2.5 w-full border-t border-white/20 pt-2.5 sm:mt-3 sm:pt-3">
              <p className="text-balance text-[8px] font-semibold uppercase leading-[1.35] tracking-[0.16em] text-white/90 sm:text-[10px] sm:tracking-[0.22em]">
                {stat.label}
              </p>
            </div>
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
