"use client";

import { useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: 0 | 100 | 200 | 300 | 400 | 500;
  threshold?: number;
};

const DELAY_CLASS: Record<number, string> = {
  0: "",
  100: "delay-100",
  200: "delay-200",
  300: "delay-300",
  400: "delay-400",
  500: "delay-500",
};

export function FadeIn({
  children,
  className = "",
  delay = 0,
  threshold = 0.15,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      el.classList.add("is-visible");
    };

    // Već u viewportu (npr. ispod hero-a nakon učitavanja) — odmah prikaži, bez čekanja scroll-a
    const rect = el.getBoundingClientRect();
    const vh = typeof window !== "undefined" ? window.innerHeight : 0;
    const alreadyVisible = rect.top < vh * 0.92 && rect.bottom > vh * 0.08;
    if (alreadyVisible) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "120px 0px 120px 0px" },
    );
    observer.observe(el);

    const failSafe = window.setTimeout(reveal, 4000);

    return () => {
      window.clearTimeout(failSafe);
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={["fade-in", DELAY_CLASS[delay], className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
