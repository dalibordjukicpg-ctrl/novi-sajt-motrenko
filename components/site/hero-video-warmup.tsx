"use client";

import { useEffect, useRef } from "react";

import { FALLBACK_HERO_VIDEO_PATH_REL } from "@/lib/clinic-assets";

/** Drži hero video u browser cache-u — manje flash-a pri navigaciji. */
export function HeroVideoWarmup() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.load();
  }, []);

  return (
    <video
      ref={ref}
      aria-hidden
      tabIndex={-1}
      muted
      playsInline
      preload="auto"
      src={FALLBACK_HERO_VIDEO_PATH_REL}
      className="pointer-events-none fixed left-0 top-0 h-0 w-0 opacity-0"
    />
  );
}
