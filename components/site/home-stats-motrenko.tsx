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
  <Heart size={16} strokeWidth={1.5} fill="currentColor" key="heart" />,
  <Baby size={16} strokeWidth={1.5} key="baby" />,
  <Users size={16} strokeWidth={1.5} key="users" />,
  <Star size={16} strokeWidth={1.5} fill="currentColor" key="star" />,
];

function StatPremiumIcon({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto shrink-0">
      <div
        aria-hidden
        className="absolute -inset-1 rounded-full bg-[rgb(232_104_42/0.5)] blur-[6px]"
      />
      <div className="relative flex size-9 items-center justify-center rounded-full border border-[rgb(255_220_190/0.45)] bg-gradient-to-br from-[rgb(255_245_235/0.35)] via-[rgb(232_104_42/0.28)] to-[rgb(180_70_20/0.35)] text-[#fff8f2] shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md lg:size-10">
        <span className="drop-shadow-[0_1px_4px_rgba(232,104,42,0.6)] [&_svg]:opacity-95">
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
      className="absolute inset-0 h-full w-full object-cover saturate-[1.05] contrast-[1.06]"
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
          "group relative flex h-full min-h-[13.25rem] flex-col overflow-hidden rounded-2xl sm:min-h-[12.5rem] sm:rounded-[1.35rem]",
          "bg-[#120a06] ring-1 ring-white/[0.08] transition-all duration-500 ease-out",
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
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.05]">
            <StatCardBg src={stat.bgImage} position={stat.bgPosition} />
          </div>
          <div className="absolute inset-0 bg-[#1a1208]/10 mix-blend-multiply" />
          <div
            className="absolute inset-0"
            style={{
              background: [
                "linear-gradient(to top, rgb(10 6 3 / 0.98) 0%, rgb(14 8 4 / 0.88) 28%, rgb(18 10 6 / 0.42) 52%, transparent 72%)",
                "linear-gradient(135deg, rgba(232,104,42,0.14) 0%, transparent 50%)",
              ].join(", "),
            }}
          />
        </div>

        <div className="flex-1" aria-hidden />

        <div className="relative z-10 mt-auto w-full px-3 pb-3 sm:px-5 sm:pb-5 lg:pb-6">
          <div className="min-h-[6.85rem] rounded-xl border border-white/10 bg-[rgb(12_7_4/0.72)] px-3 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md sm:min-h-[7.35rem] lg:min-h-[7.5rem] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <div className="grid h-full grid-cols-[2.25rem_minmax(0,1fr)] grid-rows-[auto_auto] items-start gap-x-3 lg:grid-cols-[2.5rem_minmax(0,1fr)]">
              <div className="row-start-1 flex h-9 items-center justify-center lg:h-10">
                <StatPremiumIcon>{STAT_ICONS[index % STAT_ICONS.length]}</StatPremiumIcon>
              </div>

              <div className="row-start-1 flex h-9 items-center lg:h-10">
                <p
                  className="w-full text-left text-[1.65rem] font-semibold leading-none tracking-tight text-white tabular-nums lg:text-[2.35rem]"
                  style={{
                    fontFamily: "var(--font-playfair), Georgia, serif",
                    textShadow: "0 2px 16px rgba(0,0,0,0.45)",
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

              <div className="col-start-2 row-start-2 mt-2 min-h-[2.95rem] w-full border-t border-white/15 pt-2.5 lg:min-h-[3.05rem] lg:pt-3">
                <p className="w-full text-left text-[10px] font-semibold uppercase leading-[1.34] tracking-[0.13em] text-[#f3e8df] lg:text-[10px] lg:tracking-[0.16em] lg:text-white/92">
                  {stat.label}
                </p>
              </div>
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
        <div className="grid grid-cols-2 items-stretch gap-3.5 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {items.map((stat, i) => (
            <StatItem key={`stat-${i}`} stat={stat} delay={i * 100} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
