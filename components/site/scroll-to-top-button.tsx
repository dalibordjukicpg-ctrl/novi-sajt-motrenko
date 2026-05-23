"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 380;

/**
 * Fiksno dugme koje glatko vraća skrol na vrh (iOS / Android prijateljski —
 * safe-area-inset, min. 44px dodir).
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = () => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollUp}
      className="site-scroll-top-btn fixed z-[170] flex size-11 items-center justify-center rounded-full border border-white/80 bg-site-brand text-white shadow-[0_8px_28px_-4px_rgba(232,104,42,0.45),0_4px_14px_rgba(0,0,0,0.12)] transition hover:bg-site-brand-hover hover:shadow-[0_10px_32px_-4px_rgba(232,104,42,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-brand active:scale-[0.97] max-md:bottom-[5.75rem] bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] md:size-12"
      style={{
        right: "max(0.75rem, calc(env(safe-area-inset-right, 0px) + 0.25rem))",
      }}
      aria-label="Na vrh stranice"
      title="Na vrh"
    >
      <ChevronUp className="size-6" strokeWidth={2} aria-hidden />
    </button>
  );
}
