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
      className="absolute inset-0 h-full w-full object-cover"
      style={{ objectPosition: pos }}
      onError={() => setUseFallback(true)}
    />
  );
}

/*
 * KONTROLA IZGLEDA STAT KARTICA:
 *   • Vidljivost foto  → ivory-wash gradient opacity vrijednosti ispod
 *   • Blur kartice     → backdropFilter: "blur(Xpx)"
 *   • Hover podizanje  → translateY u onMouseEnter
 *   • Ikone            → STAT_ICONS niz na vrhu fajla
 */

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
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const count = useCountUp(target, 1800, vis && displayStatic === null);

  const shadowBase =
    "0 2px 0 rgba(255,255,255,0.95) inset, 0 20px 60px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px rgba(180,160,140,0.14)";
  const shadowHover =
    "0 2px 0 rgba(255,255,255,0.95) inset, 0 28px 70px rgba(0,0,0,0.09), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(232,104,42,0.20)";

  return (
    <div ref={ref} className="h-full">
      <div
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/70 px-5 pb-6 pt-5 sm:rounded-3xl sm:px-6 sm:pb-7 sm:pt-6"
        style={{
          opacity: vis ? 1 : 0,
          transitionDelay: `${delay}ms`,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: shadowBase,
          transition: "all 0.35s ease",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-4px)";
          el.style.boxShadow = shadowHover;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = shadowBase;
        }}
      >
        {/* Foto pozadina + warm ivory wash — smanjite opacity za jasniju sliku */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl"
          aria-hidden
        >
          <StatCardBg src={stat.bgImage} position={stat.bgPosition} />
          {/*
           * Horizontalni fade — lijeva strana bijela (tekst čitljiv),
           * desna strana otkriva fotografiju.
           * KONTROLA: mijenjaj % granice ili alpha vrijednosti:
           *   • 0%→50%: bijela zona (gdje je tekst)
           *   • 50%→100%: prelaz u prozirno (foto se pojavljuje)
           */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(255,253,250,1.00) 0%, rgba(255,252,248,1.00) 30%, rgba(255,251,246,0.92) 48%, rgba(253,249,243,0.45) 66%, rgba(250,246,240,0.06) 100%)",
            }}
          />
        </div>

        {/* Gornji bijeli highlight — uklonjen da ne stvara liniju */}

        {/* Sadržaj */}
        <div className="relative z-10 flex h-full flex-col">
          {/* Ikona — gornji lijevi ugao */}
          <div className="mb-auto flex size-9 items-center justify-center rounded-xl bg-white/75 text-site-brand shadow-[0_1px_6px_rgba(0,0,0,0.07)] ring-1 ring-white/60 sm:size-10">
            {STAT_ICONS[index % STAT_ICONS.length]}
          </div>

          {/* Broj + suffix */}
          <p
            className="mt-4 text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-none tracking-tight text-site-brand transition-transform duration-300 group-hover:scale-[1.03]"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              textShadow: "0 1px 8px rgba(255,255,255,0.7)",
            }}
          >
            {displayStatic !== null ? (
              displayStatic
            ) : (
              <>
                {count.toLocaleString("sr-Latn-ME")}
                <span>{suffix}</span>
              </>
            )}
          </p>

          {/* Label */}
          <p className="mt-2.5 text-[9.5px] font-bold uppercase leading-snug tracking-[0.22em] text-site-ink/70 sm:text-[10.5px]">
            {stat.label}
          </p>
        </div>
      </div>
    </div>
  );
}

type Props = { items: HomeStatItem[] };

export function HomeStatsMotrenko({ items }: Props) {
  return (
    <section className="site-section site-section-scrim relative z-[1] overflow-x-hidden py-section-y">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-16">
        <div className="grid grid-cols-2 gap-4 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {items.map((stat, i) => (
            <StatItem key={`stat-${i}`} stat={stat} delay={i * 100} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
