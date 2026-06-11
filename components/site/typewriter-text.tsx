"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  text: string;
  /** ms po karakteru */
  speed?: number;
  className?: string;
  showCursor?: boolean;
};

function useTypewriter(text: string, speed: number) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, speed);

    return () => window.clearInterval(id);
  }, [text, speed, reduceMotion]);

  return { displayed, done, reduceMotion };
}

export function TypewriterText({
  text,
  speed = 42,
  className,
  showCursor = true,
}: Props) {
  const { displayed, done, reduceMotion } = useTypewriter(text, speed);

  const cursor =
    showCursor && !done && !reduceMotion ? (
      <span
        aria-hidden
        className="ml-px inline-block w-[2px] animate-pulse opacity-80 motion-reduce:hidden"
      >
        |
      </span>
    ) : null;

  return (
    <>
      <span className={cn("md:hidden", className)}>
        {displayed.replace(/\n/g, " ")}
        {cursor}
      </span>
      <span className={cn("hidden whitespace-pre-line md:inline", className)}>
        {displayed}
        {cursor}
      </span>
    </>
  );
}
