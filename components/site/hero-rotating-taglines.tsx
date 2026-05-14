"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  lines: string[];
  intervalMs?: number;
  className?: string;
};

/** Rotirajući naslovi u stilu embryolab.eu — suptilan crossfade / vertikalni pomičaj. */
export function HeroRotatingTaglines({
  lines,
  intervalMs = 5200,
  className,
}: Props) {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const advance = useCallback(() => {
    setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
  }, [filtered.length]);

  useEffect(() => {
    if (filtered.length <= 1 || reduceMotion) return;
    const id = setInterval(advance, intervalMs);
    return () => clearInterval(id);
  }, [advance, filtered.length, intervalMs, reduceMotion]);

  if (filtered.length === 0) return null;

  const active = reduceMotion ? 0 : index;

  return (
    <div className={cn("mt-1", className)}>
      <p
        className="relative min-h-[1.4em] font-serif text-4xl font-semibold leading-tight tracking-tight md:min-h-[1.3em] md:text-5xl lg:min-h-[1.25em] lg:text-6xl"
        aria-live="polite"
        aria-atomic="true"
      >
        {filtered.map((line, i) => (
          <span
            key={`${i}-${line.slice(0, 24)}`}
            className={cn(
              "absolute left-0 top-0 block max-w-3xl bg-gradient-to-r from-teal-800 to-teal-600 bg-clip-text text-transparent transition-all duration-700 ease-out motion-reduce:transition-none",
              i === active
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            {line}
          </span>
        ))}
      </p>
      {filtered.length > 1 ? (
        <div
          className="mt-5 flex gap-2"
          role="tablist"
          aria-label="Promjena poruke u baneru"
        >
          {filtered.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Poruka ${i + 1} od ${filtered.length}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active
                  ? "w-8 bg-teal-600"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
