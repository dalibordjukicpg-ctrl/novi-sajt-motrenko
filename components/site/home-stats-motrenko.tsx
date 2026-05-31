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

function StatPremiumIcon({
  children,
  variant = "dark",
}: {
  children: ReactNode;
  variant?: "dark" | "light";
}) {
  if (variant === "light") {
    return (
      <div className="relative shrink-0">
        <div
          aria-hidden
          className="absolute -inset-1.5 rounded-full bg-[rgb(var(--site-brand-rgb)/0.22)] blur-[7px]"
        />
        <div className="relative flex size-10 items-center justify-center rounded-full border border-[rgb(var(--site-brand-rgb)/0.18)] bg-gradient-to-br from-white via-[#fffaf6] to-[#ffefe3] text-site-brand shadow-[0_4px_16px_rgb(var(--site-brand-rgb)/0.14),inset_0_1px_0_rgba(255,255,255,0.95)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <div
        aria-hidden
        className="absolute -inset-1 rounded-full bg-[rgb(232_104_42/0.45)] blur-[5px]"
      />
      <div className="relative flex size-8 items-center justify-center rounded-full border border-white/40 bg-gradient-to-br from-white/35 to-[rgb(232_104_42/0.35)] text-[#fff8f2] shadow-[0_4px_14px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.45)] lg:size-10">
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
  compact,
  light,
}: {
  displayStatic: string | null;
  count: number;
  suffix: string;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <p
      className={[
        "font-semibold leading-none tracking-tight tabular-nums",
        light ? "text-site-ink" : "text-white",
        compact ? "text-[1.7rem]" : "text-[1.45rem] lg:text-[2.35rem]",
      ].join(" ")}
      style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        textShadow: light ? "none" : "0 2px 12px rgba(0,0,0,0.35)",
      }}
    >
      {displayStatic !== null ? (
        <span>{displayStatic}</span>
      ) : (
        <>
          <span>{count.toLocaleString("sr-Latn-ME")}</span>
          {suffix ? (
            <span
              className={[
                "ml-0.5 text-[0.58em] font-semibold",
                light ? "text-site-brand" : "text-[var(--site-peach)]",
              ].join(" ")}
            >
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
          "group relative overflow-hidden rounded-[1.15rem] md:rounded-2xl lg:rounded-[1.35rem]",
          "h-[6.25rem] md:h-[14rem] lg:h-full lg:min-h-[12.5rem]",
          "bg-gradient-to-br from-white via-[#fffaf6] to-[#ffefe3] md:bg-[#3d2a1f]",
          "ring-1 ring-[rgb(var(--site-brand-rgb)/0.12)] md:ring-white/15",
          "shadow-[0_2px_0_rgba(255,255,255,0.95)_inset,0_14px_36px_-10px_rgba(28,18,10,0.1),0_4px_14px_rgb(var(--site-brand-rgb)/0.08)]",
          "md:shadow-[0_10px_28px_-12px_rgba(28,18,10,0.18)]",
          "transition-all duration-500 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-12px_rgba(28,18,10,0.14),0_6px_18px_rgb(var(--site-brand-rgb)/0.12)] md:hover:-translate-y-1 md:hover:shadow-[0_20px_44px_-12px_rgba(28,18,10,0.28)]",
          vis ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 hidden transition-transform duration-700 ease-out group-hover:scale-[1.04] md:block">
            <StatCardBg src={stat.bgImage} position={stat.bgPosition} />
          </div>

          {/* Mobil: svijetla ivory kartica, foto diskretno desno */}
          <div className="absolute inset-0 md:hidden">
            <div className="absolute inset-y-0 right-0 w-[46%] overflow-hidden">
              <div className="absolute inset-0 scale-[1.08] opacity-90 saturate-[1.08] transition-transform duration-700 ease-out group-hover:scale-[1.12]">
                <StatCardBg src={stat.bgImage} position={stat.bgPosition} />
              </div>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to left, rgb(255 250 245 / 0.08) 0%, rgb(255 252 248 / 0.72) 52%, rgb(255 252 248 / 0.96) 100%)",
                }}
              />
            </div>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, rgb(255 252 248 / 0.98) 0%, rgb(255 249 244 / 0.94) 54%, rgb(255 245 237 / 0.55) 100%)",
              }}
            />
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[rgb(var(--site-brand-rgb)/0.35)] to-transparent" />
          </div>

          <div
            className="absolute inset-0 hidden md:block lg:hidden"
            style={{
              background: [
                "linear-gradient(to top, rgb(52 36 26 / 0.62) 0%, rgb(68 48 34 / 0.38) 38%, rgb(82 58 42 / 0.1) 62%, transparent 100%)",
                "linear-gradient(135deg, rgba(232,104,42,0.16) 0%, transparent 50%)",
              ].join(", "),
            }}
          />
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              background: [
                "linear-gradient(to top, rgb(48 32 22 / 0.72) 0%, rgb(62 42 30 / 0.42) 40%, transparent 70%)",
                "linear-gradient(135deg, rgba(232,104,42,0.14) 0%, transparent 50%)",
              ].join(", "),
            }}
          />
        </div>

        {/* Mobil: puna širina, jedna ispod druge */}
        <div className="relative z-10 flex h-full items-center gap-3.5 px-4 md:hidden">
          <StatPremiumIcon variant="light">{icon}</StatPremiumIcon>
          <div className="min-w-0 flex-1 pr-1">
            <StatValue
              compact
              light
              displayStatic={displayStatic}
              count={count}
              suffix={suffix}
            />
            <p className="mt-1.5 text-[11px] font-medium leading-snug text-site-muted">
              {stat.label}
            </p>
          </div>
        </div>

        {/* Tablet: 2 kolone */}
        <div className="absolute inset-x-0 bottom-0 z-10 hidden h-[7.35rem] px-2.5 pb-2.5 pt-4 md:block lg:hidden">
          <div className="flex h-full flex-col justify-end">
            <div className="flex items-center gap-2">
              <StatPremiumIcon>{icon}</StatPremiumIcon>
              <StatValue displayStatic={displayStatic} count={count} suffix={suffix} />
            </div>
            <p className="mt-2 line-clamp-3 min-h-[2.85rem] text-[9.5px] font-medium leading-[1.36] text-[#faf6f0]">
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
        <div className="grid grid-cols-1 items-stretch gap-3.5 md:grid-cols-2 md:gap-4 lg:grid-cols-4 lg:gap-6">
          {items.map((stat, i) => (
            <StatItem key={`stat-${i}`} stat={stat} delay={i * 100} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
