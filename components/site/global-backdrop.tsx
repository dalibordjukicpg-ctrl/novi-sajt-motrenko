"use client";

/**
 * GlobalBackdrop — premium IVF background sistem za cijeli sajt
 * ─────────────────────────────────────────────────────────────
 * Rendruje se jednom u root layout-u, fiksiran iza svakog sadržaja.
 * Koristi CSS custom property --scroll-y za GPU-akcelerisani parallax.
 *
 * KONTROLA INTENZITETA (sve u ovom fajlu):
 *  • Embrion opacity    → <img style={{ opacity: X }}> — trenutno 0.44
 *  • Embrion parallax   → scrollMultiplier na embryoY  — trenutno 0.09
 *  • Wave parallax      → waveY multiplier             — trenutno 0.04
 *  • Glow opacity       → style={{ opacity: X }}       — trenutno 0.70
 *  • Particle opacity   → dot.op vrijednosti            — 0.18–0.30
 *
 * RESPONSIVE:
 *  • Na mobile (<768px): manji embrion, wave sakriven
 *  • Na tablet/desktop:  puni efekat
 */

import { useEffect, useRef } from "react";

const EMBRYO_PARALLAX = 0.09;   // koliko embrion kasni za scrollom (0 = fiksiran, 0.2 = sporiji)
const WAVE_PARALLAX   = 0.04;   // koliko talasi kasni (manje = sporije = dubina)
const GLOW_PARALLAX   = 0.06;   // srednji sloj (peach glow)

const PARTICLE_DOTS = [
  { top: "10%", left: "20%",  size: 8,  op: 0.30 },
  { top: "24%", left: "9%",   size: 5,  op: 0.22 },
  { top: "38%", left: "24%",  size: 4,  op: 0.18 },
  { top: "16%", right: "44%", size: 6,  op: 0.22 },
  { top: "52%", right: "30%", size: 7,  op: 0.26 },
  { top: "66%", left: "38%",  size: 4,  op: 0.16 },
  { top: "7%",  right: "22%", size: 9,  op: 0.20 },
  { top: "60%", right: "20%", size: 5,  op: 0.20 },
  { top: "78%", left: "15%",  size: 6,  op: 0.15 },
  { top: "82%", right: "38%", size: 4,  op: 0.14 },
] as const;

export function GlobalBackdrop() {
  const embryoRef = useRef<HTMLDivElement>(null);
  const glowRef   = useRef<HTMLDivElement>(null);
  const waveRef   = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        embryoRef.current?.style.setProperty(
          "transform",
          `translateY(${-sy * EMBRYO_PARALLAX}px)`,
        );
        glowRef.current?.style.setProperty(
          "transform",
          `translateY(${-sy * GLOW_PARALLAX}px)`,
        );
        if (waveRef.current) {
          waveRef.current.style.transform =
            `translateY(${-sy * WAVE_PARALLAX}px)`;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 select-none overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {/* ── Layer 1: Ivory base gradient — unifomrniji, bez oštrih tonalnih skokova ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #fdfaf6 0%, #faf7f2 25%, #f9f5ef 50%, #faf7f2 75%, #fdfaf6 100%)",
        }}
      />
      {/* Peach warm wash — suptilan, da pokrije moguće tonske skokove */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 65% 30%, rgba(251,231,216,0.22) 0%, rgba(255,248,242,0.10) 50%, transparent 80%)",
        }}
      />

      {/* ── Layer 2: Peach ambient glow — parallax srednji sloj ───────────── */}
      {/* Kontrola: mijenjajte opacity (0.0–1.0) */}
      <div
        ref={glowRef}
        className="absolute will-change-transform"
        style={{
          top: "-8%",
          right: "-6%",
          width: "min(68vw, 54rem)",
          height: "min(68vw, 54rem)",
          borderRadius: "48% 52% 44% 56% / 50% 46% 54% 50%",
          background:
            "radial-gradient(ellipse 68% 68% at 55% 46%, rgba(242,192,140,0.42) 0%, rgba(232,104,42,0.12) 48%, transparent 72%)",
          filter: "blur(56px)",
          opacity: 0.70,
        }}
      />

      {/* ── Layer 3: Embrion slika — najsporiji parallax ──────────────────── */}
      {/* Kontrola: opacity ispod (0.44 = zadano) */}
      <div
        ref={embryoRef}
        className="absolute will-change-transform"
        style={{
          top: "-4%",
          right: "-7%",
          width: "min(66vw, 52rem)",
          height: "min(66vw, 52rem)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/site-backdrop.png"
          alt=""
          width={832}
          height={832}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "top right",
            opacity: 0.44,
            mixBlendMode: "multiply",
          }}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </div>

      {/* ── Layer 4: SVG talasi — najbrži (ali i dalje sporiji od contenta) ─ */}
      {/* Kontrola: stopOpacity vrijednosti u gradijentima */}
      <svg
        ref={waveRef}
        className="absolute will-change-transform max-md:opacity-50"
        style={{
          top: "6%",
          left: "-3%",
          width: "min(58vw, 46rem)",
          height: "min(95vh,76rem)",
          overflow: "visible",
        }}
        viewBox="0 0 480 860"
        preserveAspectRatio="xMinYMin meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bg-wave-a" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgb(232,104,42)" stopOpacity="0.24" />
            <stop offset="55%"  stopColor="rgb(232,104,42)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="rgb(232,104,42)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bg-wave-b" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgb(242,192,140)" stopOpacity="0.30" />
            <stop offset="60%"  stopColor="rgb(232,104,42)"  stopOpacity="0.10" />
            <stop offset="100%" stopColor="rgb(232,104,42)"  stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gornji blok talasa */}
        {([0,10,20,30,40,50,60,70] as const).map((off, i) => (
          <path
            key={`wa-${i}`}
            d={`M -20 ${255+off} C 55 ${210+off} 160 ${300+off} 240 ${255+off} S 380 ${210+off} 500 ${255+off}`}
            stroke="url(#bg-wave-a)"
            strokeWidth={i % 2 === 0 ? "1.1" : "0.75"}
            strokeLinecap="round"
          />
        ))}

        {/* Srednji blok (topliji) */}
        {([0,14,28,42,56,70] as const).map((off, i) => (
          <path
            key={`wb-${i}`}
            d={`M -30 ${490+off} C 75 ${440+off} 195 ${540+off} 300 ${490+off} S 445 ${445+off} 520 ${490+off}`}
            stroke="url(#bg-wave-b)"
            strokeWidth={i % 2 === 0 ? "1.0" : "0.65"}
            strokeLinecap="round"
          />
        ))}

        {/* Donji blok */}
        {([0,16,32] as const).map((off, i) => (
          <path
            key={`wc-${i}`}
            d={`M 30 ${680+off} C 110 ${638+off} 210 ${720+off} 310 ${680+off} S 430 ${648+off} 500 ${668+off}`}
            stroke="url(#bg-wave-a)"
            strokeWidth="0.75"
            strokeLinecap="round"
            strokeOpacity="0.70"
          />
        ))}
      </svg>

      {/* ── Layer 5: Particle dots ────────────────────────────────────────── */}
      {PARTICLE_DOTS.map((dot, i) => (
        <div
          key={`pd-${i}`}
          className="absolute rounded-full"
          style={{
            top:    dot.top,
            left:   "left" in dot ? dot.left : undefined,
            right:  "right" in dot ? dot.right : undefined,
            width:  dot.size,
            height: dot.size,
            background:
              "radial-gradient(circle, rgba(232,104,42,0.75) 0%, rgba(242,192,140,0.45) 55%, transparent 100%)",
            opacity: dot.op,
            filter:  "blur(1px)",
          }}
        />
      ))}

      {/* ── Layer 6: Grain texture overlay ───────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.022,
          mixBlendMode: "multiply",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}
