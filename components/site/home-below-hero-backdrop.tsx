/**
 * HomeBelowHeroBackdrop
 * ─────────────────────
 * Dekorativni pozadinski sloj ispod hero sekcije (statistike, usluge, tim).
 * Hero baner se NE dira. Ovaj sloj je z-0, sadržaj sekcija je z-[1].
 *
 * Kako prilagoditi intenzitet:
 *  • Embrion fotografija  → promijenite `opacity` na <img> elementu (trenutno 0.38)
 *  • Peach glow orb        → promijenite `opacity` na .orb-embryo divovima
 *  • SVG talasi            → stroke-opacity u SVG pathovima
 *  • Particle dots         → opacity na .particle-dot divovima
 *  • Blur jačina           → filter: blur(Xpx) na orb divovima
 */
export function HomeBelowHeroBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
    >
      {/* ── 1. Fotografija embriona (desna strana) ─────────────────────────── */}
      {/* Opacity: 0.38 — povećaj za jači efekat, smanji za suptilniji */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home-embryo-bg.png"
        alt=""
        className="absolute right-[-6%] top-[-2%] w-[min(65vw,52rem)] max-w-none"
        style={{
          opacity: 0.38,
          mixBlendMode: "multiply",
          objectFit: "contain",
          objectPosition: "top right",
        }}
        loading="eager"
        decoding="async"
      />

      {/* ── 2. Peach/amber glow iza fotografije ────────────────────────────── */}
      {/* Mijenjajte opacity (0.0–1.0) za intenzitet toplog sjaja */}
      <div
        className="absolute right-[-4%] top-[0%] h-[min(58vw,44rem)] w-[min(58vw,44rem)]"
        style={{
          borderRadius: "48% 52% 44% 56% / 50% 46% 54% 50%",
          background:
            "radial-gradient(ellipse 70% 70% at 55% 45%, rgba(242, 192, 140, 0.42) 0%, rgba(232, 104, 42, 0.14) 45%, transparent 72%)",
          filter: "blur(48px)",
          opacity: 0.85,
        }}
      />

      {/* ── 3. SVG talasi (lijeva strana) ──────────────────────────────────── */}
      {/* stroke-opacity na pathovima: snizi ispod 0.12 za suptilnije talase   */}
      <svg
        className="absolute -left-[2%] top-[8%] h-[min(90vh,72rem)] w-[min(55vw,44rem)] max-w-none"
        viewBox="0 0 500 900"
        preserveAspectRatio="xMinYMin meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wave-grad-a" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgb(232,104,42)" stopOpacity="0.22" />
            <stop offset="50%"  stopColor="rgb(232,104,42)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="rgb(232,104,42)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wave-grad-b" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgb(242,192,140)" stopOpacity="0.28" />
            <stop offset="60%"  stopColor="rgb(232,104,42)"  stopOpacity="0.10" />
            <stop offset="100%" stopColor="rgb(232,104,42)"  stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Blok tankih talasa — imitira referentnu sliku */}
        {[0,10,20,30,40,50,60].map((offset, i) => (
          <path
            key={`wave-a-${i}`}
            d={`M -20 ${300 + offset} C 60 ${260 + offset} 160 ${340 + offset} 240 ${300 + offset} S 380 ${260 + offset} 520 ${300 + offset}`}
            stroke="url(#wave-grad-a)"
            strokeWidth={i % 2 === 0 ? "1.1" : "0.8"}
            strokeLinecap="round"
          />
        ))}

        {/* Drugi blok talasa (niže, toplija nijansa) */}
        {[0,14,28,42,56].map((offset, i) => (
          <path
            key={`wave-b-${i}`}
            d={`M -30 ${520 + offset} C 80 ${470 + offset} 200 ${570 + offset} 310 ${520 + offset} S 450 ${470 + offset} 540 ${510 + offset}`}
            stroke="url(#wave-grad-b)"
            strokeWidth={i % 2 === 0 ? "1.0" : "0.7"}
            strokeLinecap="round"
          />
        ))}

        {/* Manji dijagonalni talasi */}
        {[0,18,36].map((offset, i) => (
          <path
            key={`wave-c-${i}`}
            d={`M 40 ${680 + offset} C 120 ${640 + offset} 220 ${720 + offset} 320 ${680 + offset} S 430 ${650 + offset} 510 ${670 + offset}`}
            stroke="url(#wave-grad-a)"
            strokeWidth="0.75"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        ))}
      </svg>

      {/* ── 4. Floating particle dots ──────────────────────────────────────── */}
      {/* Mijenjajte opacity za intenzitet čestica                              */}
      {[
        { top: "12%", left: "18%",  size: 7,  op: 0.35 },
        { top: "28%", left: "8%",   size: 5,  op: 0.25 },
        { top: "42%", left: "22%",  size: 4,  op: 0.20 },
        { top: "18%", right: "42%", size: 5,  op: 0.22 },
        { top: "55%", right: "28%", size: 6,  op: 0.28 },
        { top: "70%", left: "35%",  size: 4,  op: 0.18 },
        { top: "8%",  right: "20%", size: 8,  op: 0.20 },
        { top: "62%", right: "18%", size: 5,  op: 0.22 },
      ].map((dot, i) => (
        <div
          key={`dot-${i}`}
          className="absolute rounded-full"
          style={{
            top:    dot.top,
            left:   "left" in dot ? dot.left : undefined,
            right:  "right" in dot ? dot.right : undefined,
            width:  dot.size,
            height: dot.size,
            background: "radial-gradient(circle, rgba(232,104,42,0.7) 0%, rgba(242,192,140,0.4) 60%, transparent 100%)",
            opacity: dot.op,
            filter: "blur(1.5px)",
          }}
        />
      ))}

      {/* ── 5. Donji ivory gradient prelaz ─────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, var(--site-canvas) 100%)",
        }}
      />
    </div>
  );
}
