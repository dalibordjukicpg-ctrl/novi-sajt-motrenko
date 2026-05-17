"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /**
   * Pomjeraj pozadine u odnosu na skrol (0 = isključeno).
   * Embryolab-stil: ~0.25–0.4
   */
  parallaxIntensity?: number;
};

/**
 * Blagi parallax na pozadini heroa — pomiče sloj sporije od sadržaja pri skrolu.
 * Štiti `prefers-reduced-motion`.
 */
export function HeroMotionLayer({ children, parallaxIntensity = 0.34 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = mq.matches;

    const apply = () => {
      if (!el) return;
      if (reduced || parallaxIntensity <= 0) {
        el.style.transform = "";
        return;
      }
      const y = window.scrollY;
      el.style.transform = `translate3d(0, ${(y * parallaxIntensity).toFixed(2)}px, 0)`;
    };

    const onMq = () => {
      reduced = mq.matches;
      apply();
    };

    mq.addEventListener("change", onMq);
    window.addEventListener("scroll", apply, { passive: true });
    apply();

    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("scroll", apply);
    };
  }, [parallaxIntensity]);

  return (
    <div ref={ref} className="absolute inset-0 will-change-transform">
      {children}
    </div>
  );
}
