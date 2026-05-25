"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Baby, Heart, Star, Users } from "lucide-react";

import { CLINIC_PAGE_HERO_BG } from "@/lib/clinic-assets";

export type HomeStatItem = {
  valueRaw: string;
  label: string;
  bgImage: string;
  bgPosition?: string;
};

const STAT_ICONS = [
  <Heart size={15} strokeWidth={1.5} fill="currentColor" key="heart" />,
  <Baby size={15} strokeWidth={1.5} key="baby" />,
  <Users size={15} strokeWidth={1.5} key="users" />,
  <Star size={15} strokeWidth={1.5} fill="currentColor" key="star" />,
];

function StatPremiumIcon({ children }: { children: ReactNode }) {
  return (
    <div className="relative shrink-0">
      <div
        aria-hidden
        className="absolute -inset-1 rounded-full bg-[rgb(232_104_42/0.45)] blur-[5px]"
      />
      <div className="relative flex size-8 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-white/25 to-[rgb(232_104_42/0.3)] text-[#fff8f2] shadow-[0_4px_14px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] lg:size-10">
        {children}
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
      className="absolute inset-0 h-full w-full object-cover"
      style={{ objectPosition: pos }}
      onError={() => setUseFallback(true)}
    />
  );
}

function StatValue({
  displayStatic,
  count,
  suffix,
}: {
  displayStatic: string | null;
  count: number;
  suffix: string;
}) {
  return (
    <p
      className="text-[1.45rem] font-semibold leading-none tracking-tight text-white tabular-nums lg:text-[2.35rem]"
      style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        textShadow: "0 2px 12px rgba(0,0,0,0.4)",
      }}
    >
      {displayStatic !== null ? (
        <span>{displayStatic}</span>
      ) : (
        <>
          <span>{count.toLocaleString("sr-Latn-ME")}</span>
          {suffix ? (
            <span className="ml-0.5 text-[0.58em] font-semibold text-[var(--site-peach)]">
              {suffix}
            </span>
          ) : null}
        </>
      )}
    </p>
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
  const icon = STAT_ICONS[index % STAT_ICONS.length];

  return (
    <div ref={ref} className="h-full">
      <article
        className={[
          "group relative h-[14rem] overflow-hidden rounded-2xl lg:h-full lg:min-h-[12.5rem] lg:rounded-[1.35rem]",
          "bg-[#120a06] ring-1 ring-black/10 transition-all duration-500 ease-out",
          "shadow-[0_12px_32px_-12px_rgba(28,18,10,0.25)]",
          "hover:-translate-y-1 hover:shadow-[0_20px_44px_-12px_rgba(28,18,10,0.32)]",
          vis ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
            <StatCardBg src={stat.bgImage} position={stat.bgPosition} />
          </div>
          <div
            className="absolute inset-0 lg:hidden"
            style={{
              background:
                "linear-gradient(to top, rgb(8 5 3 / 0.97) 0%, rgb(10 6 4 / 0.82) 34%, rgb(12 8 5 / 0.2) 62%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              background: [
                "linear-gradient(to top, rgb(10 6 3 / 0.95) 0%, rgb(14 8 4 / 0.55) 40%, transparent 70%)",
                "linear-gradient(135deg, rgba(232,104,42,0.12) 0%, transparent 50%)",
              ].join(", "),
            }}
          />
        </div>

        {/* Mobil: fiksna traka na dnu — ista visina na svim karticama */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-[7.35rem] px-2.5 pb-2.5 pt-4 lg:hidden">
          <div className="flex h-full flex-col justify-end">
            <div className="flex items-center gap-2">
              <StatPremiumIcon>{icon}</StatPremiumIcon>
              <StatValue displayStatic={displayStatic} count={count} suffix={suffix} />
            </div>
            <p className="mt-2 line-clamp-3 min-h-[2.85rem] text-[9.5px] font-medium leading-[1.36] text-[#f2e8df]">
              {stat.label}
            </p>
          </div>
        </div>

        {/* Desktop */}
        <div className="relative z-10 hidden h-full flex-col justify-end px-5 pb-6 lg:flex">
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-3">
            <div className="row-start-1 flex h-10 items-center justify-center">
              <StatPremiumIcon>{icon}</StatPremiumIcon>
            </div>
            <div className="row-start-1 flex h-10 items-center">
              <StatValue displayStatic={displayStatic} count={count} suffix={suffix} />
            </div>
            <div className="col-start-2 row-start-2 mt-2.5 min-h-[3rem] border-t border-white/15 pt-2.5">
              <p className="text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.15em] text-white/90">
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
