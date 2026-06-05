"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  isHeroBackgroundVideoUrl,
  isHeroBackgroundYoutubeUrl,
} from "@/lib/hero-background-media";
import type { HeroVideoAssets } from "@/lib/fallback-hero-video";
import {
  getHomeHeroVideoReady,
  getSavedHeroVideoTime,
  persistHeroVideoProgress,
  setHomeHeroVideoReady,
} from "@/lib/hero-video-session";

export type HomeHeroSlide = {
  eyebrow: string;
  heading: string;
  sub: string;
};

type Cta = { label: string; href: string };

export type HomeHeroPortrait = {
  src: string;
  alt: string;
};

type Props = {
  slides: HomeHeroSlide[];
  mediaUrl: string | null;
  /** Poster + mobilna MP4 varijanta (server-side resolve). */
  videoAssets?: HeroVideoAssets | null;
  primaryCta: Cta;
  secondaryCta: Cta;
  /** Moderan split layout: tekst + portret (npr. dr Motrenko). */
  portrait?: HomeHeroPortrait | null;
  /** Ispod eyebrow-a, iznad naslova (npr. ime i titula). */
  doctorCredit?: string | null;
};

export function HomeHeroMotrenko({
  slides,
  mediaUrl,
  videoAssets,
  primaryCta,
  secondaryCta,
  portrait,
  doctorCredit,
}: Props) {
  const safeSlides = useMemo(
    () => (slides.length > 0 ? slides : [{ eyebrow: "", heading: "", sub: "" }]),
    [slides],
  );
  const portraitSrc = portrait?.src?.trim() ?? "";
  const isSplit = portraitSrc.length > 0;

  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const posterSrc = videoAssets?.posterSrc?.trim() ?? "";
  const mobileVideoSrc = videoAssets?.mobileSrc?.trim() ?? "";
  const [videoReady, setVideoReady] = useState(() => getHomeHeroVideoReady());
  const bgRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isSplit || safeSlides.length <= 1) return;
    const id = setInterval(() => {
      setLeaving(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % safeSlides.length);
        setLeaving(false);
      }, 600);
    }, 6000);
    return () => clearInterval(id);
  }, [isSplit, safeSlides.length]);

  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current || !containerRef.current) return;
      if (window.matchMedia("(max-width: 767px)").matches) {
        bgRef.current.style.setProperty("--py", "0%");
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const ratio = -rect.top / window.innerHeight;
      bgRef.current.style.setProperty("--py", `${ratio * 12}%`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const slide = safeSlides[isSplit ? 0 : current];
  const url = mediaUrl?.trim() ?? "";
  const isYoutube = !isSplit && url ? isHeroBackgroundYoutubeUrl(url) : false;
  const isVideo =
    !isSplit && url ? !isYoutube && isHeroBackgroundVideoUrl(url) : false;
  const isLocalImg = url.startsWith("/");

  const markVideoVisible = () => {
    setVideoReady(true);
    setHomeHeroVideoReady();
  };

  const showVideoOverlay = isVideo && !videoReady && !posterSrc;

  useLayoutEffect(() => {
    if (!isVideo || !url) return;
    const el = videoRef.current;
    if (!el) return;

    const saved = getSavedHeroVideoTime();
    const applySaved = () => {
      try {
        if (saved > 0.05 && el.duration && saved < el.duration - 0.25) {
          el.currentTime = saved;
        }
      } catch {
        /* seek blocked until metadata */
      }
      void el.play().catch(() => {});
    };

    if (saved > 0.05) {
      if (el.readyState >= 1) applySaved();
      else el.addEventListener("loadedmetadata", applySaved, { once: true });
    } else {
      void el.play().catch(() => {});
    }
  }, [isVideo, url]);

  useEffect(() => {
    if (!isVideo || !url) return;
    const el = videoRef.current;
    const section = containerRef.current;
    if (!el || !section) return;

    const tryPlay = () => {
      void el.play().catch(() => {});
    };

    tryPlay();

    const onTime = () => {
      if (el.currentTime > 0.08) {
        persistHeroVideoProgress(el.currentTime);
      }
    };
    el.addEventListener("timeupdate", onTime);

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) tryPlay();
      },
      { threshold: 0.12 },
    );
    obs.observe(section);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      obs.disconnect();
      if (el.currentTime > 0.08) {
        persistHeroVideoProgress(el.currentTime);
      }
    };
  }, [isVideo, url]);

  if (isSplit) {
    const credit = doctorCredit?.trim() ?? "";
    return (
      <section
        ref={containerRef}
        className="relative -mt-[calc(4.25rem+env(safe-area-inset-top,0px))] overflow-hidden rounded-b-3xl md:-mt-[calc(4.75rem+env(safe-area-inset-top,0px))] md:rounded-b-[2rem]"
      >
        <div aria-hidden className="absolute inset-0 bg-site-surface-c" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-site-surface-c via-site-canvas to-site-surface-b"
        />
        <div
          aria-hidden
          className="absolute -right-20 top-16 h-[min(55vw,28rem)] w-[min(55vw,28rem)] rounded-full bg-site-brand/10 blur-[100px] md:-right-10 md:top-24"
        />
        <div
          aria-hidden
          className="absolute -left-32 bottom-10 h-[22rem] w-[22rem] rounded-full bg-site-surface-a/90 blur-[85px]"
        />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-[calc(4rem+1.25rem+env(safe-area-inset-top))] sm:px-8 md:grid-cols-[1.08fr_0.92fr] md:gap-10 md:px-12 md:pb-14 md:pt-[calc(4.5rem+2.25rem+env(safe-area-inset-top))] lg:gap-11 lg:px-16">
          <div className="order-2 flex max-w-xl flex-col text-center max-md:mx-auto md:order-1 md:max-w-none md:text-left lg:pr-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-site-brand">
              {slide.eyebrow}
            </p>
            {credit ? (
              <p className="mb-3 text-[0.95rem] font-medium leading-snug text-zinc-800">{credit}</p>
            ) : null}
            <h1
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              className="text-[clamp(1.85rem,4.5vw,3.35rem)] font-light leading-[1.08] tracking-tight text-zinc-950"
            >
              <span className="md:hidden">{slide.heading.replace(/\n/g, " ")}</span>
              <span className="hidden md:inline whitespace-pre-line">{slide.heading}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[0.875rem] leading-relaxed text-zinc-600 md:mx-0 sm:text-[0.9375rem]">
              {slide.sub}
            </p>
            <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 md:mx-0 md:max-w-none sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href={primaryCta.href}
                className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-md bg-site-brand px-5 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_32px_-8px_rgba(243,112,33,0.3)] transition-colors hover:bg-site-brand-hover sm:text-[10px]"
              >
                {primaryCta.label}
              </Link>
              <Link
                href={secondaryCta.href}
                className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-md border border-site-border bg-site-card px-5 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-site-ink shadow-site-card transition-colors hover:border-site-brand/30 hover:shadow-site-card-lg sm:text-[10px]"
              >
                {secondaryCta.label} <span className="ml-1">→</span>
              </Link>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative mx-auto w-full max-w-[min(100%,420px)] md:max-w-none">
              <div
                aria-hidden
                className="absolute -inset-2 rounded-[2rem] bg-gradient-to-tr from-site-brand/15 via-transparent to-site-surface-a opacity-95 md:-inset-3"
              />
              <div className="relative aspect-[3/3.85] overflow-hidden rounded-[1.65rem] shadow-[0_12px_36px_-16px_rgba(26,18,8,0.16)] ring-1 ring-black/[0.04] md:aspect-[3/3.7] md:rounded-[1.85rem]">
                <Image
                  src={portraitSrc}
                  alt={portrait?.alt ?? ""}
                  fill
                  priority
                  sizes="(min-width: 768px) 42vw, 100vw"
                  className="object-cover object-[center_12%]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative isolate -mt-[calc(4.25rem+env(safe-area-inset-top,0px))] overflow-hidden rounded-b-3xl bg-zinc-950 max-md:min-h-[min(78svh,580px)] max-md:h-[min(78svh,580px)] md:-mt-[calc(4.75rem+env(safe-area-inset-top,0px))] md:h-[100svh] md:min-h-[560px] md:rounded-b-[2rem] lg:min-h-[640px]"
    >
      <div
        ref={bgRef}
        className="absolute inset-0 overflow-hidden md:-bottom-[6%] md:-top-[6%]"
        style={{ transform: "translateY(var(--py, 0%))" }}
        aria-hidden
      >
        <div
          className="absolute inset-0 z-0 bg-zinc-950"
          aria-hidden
        />
        {isYoutube && url ? (
          <iframe
            title=""
            src={`${url}?autoplay=1&mute=1&controls=0&loop=1&playlist=${url.split("/embed/")[1] ?? ""}&playsinline=1`}
            className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[120%] w-[120%] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.35] object-cover"
            allow="autoplay; encrypted-media"
          />
        ) : isVideo && url ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={posterSrc || undefined}
              onLoadedData={markVideoVisible}
              onCanPlay={markVideoVisible}
              onPlaying={markVideoVisible}
              className="absolute inset-0 z-[1] h-full w-full min-h-full min-w-full object-cover max-md:object-[center_38%] md:object-[center_28%]"
            >
              {mobileVideoSrc ? (
                <source src={mobileVideoSrc} media="(max-width: 767px)" type="video/mp4" />
              ) : null}
              <source src={url} type="video/mp4" />
            </video>
            {showVideoOverlay ? (
              <div
                className="absolute inset-0 z-[2] bg-zinc-950 transition-opacity duration-500 ease-out"
                aria-hidden
              />
            ) : null}
          </>
        ) : url && isLocalImg ? (
          <Image
            src={url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover max-md:object-[center_38%] md:object-[center_28%]"
          />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover max-md:object-[center_38%] md:object-[center_28%]"
          />
        ) : null}
      </div>

      <div
        aria-hidden
        className="absolute inset-0 hidden md:block bg-gradient-to-r from-black/55 via-black/25 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/20 to-transparent md:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/72 via-black/28 to-transparent md:hidden"
      />

      <div className="relative z-10 flex h-full flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] max-md:justify-end max-md:pb-12 sm:px-8 md:justify-center md:px-24 md:pb-0 md:pt-[calc(4.5rem+env(safe-area-inset-top))]">
        <div className="w-full max-w-2xl max-md:mx-auto max-md:text-center">
          <p
            style={{
              opacity: leaving ? 0 : 1,
              transform: leaving ? "translateY(-8px)" : "translateY(0)",
              transition: "opacity 0.55s ease, transform 0.55s ease",
            }}
            className="mb-2 text-[9px] font-medium uppercase tracking-[0.28em] text-[#ffd0b8] [text-shadow:0_1px_3px_rgba(0,0,0,0.88),0_0_22px_rgba(232,104,42,0.45)] max-md:mb-2 sm:mb-4 sm:text-[10px] sm:tracking-[0.3em]"
          >
            {slide.eyebrow}
          </p>

          <h1
            style={{
              opacity: leaving ? 0 : 1,
              transform: leaving ? "translateY(16px)" : "translateY(0)",
              transition: "opacity 0.6s ease 0.05s, transform 0.6s ease 0.05s",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
            className="text-balance text-[clamp(1.5rem,6.2vw,2.5rem)] font-light leading-[1.14] tracking-tight text-[#fff8f2] [text-shadow:0_2px_10px_rgba(0,0,0,0.7),0_4px_24px_rgba(0,0,0,0.45)] max-md:mx-auto max-md:max-w-[24ch] md:whitespace-pre-line md:text-[clamp(2.65rem,5.8vw,5.5rem)] md:leading-[1.04]"
          >
            <span className="md:hidden">{slide.heading.replace(/\n/g, " ")}</span>
            <span className="hidden md:inline whitespace-pre-line">{slide.heading}</span>
          </h1>

          <p
            style={{
              opacity: leaving ? 0 : 1,
              transform: leaving ? "translateY(12px)" : "translateY(0)",
              transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
            }}
            className="mt-3 hidden max-w-[26rem] text-[0.8125rem] font-medium leading-relaxed text-[#fff8f2] [text-shadow:0_1px_0_rgba(0,0,0,0.92),0_2px_12px_rgba(0,0,0,0.78)] sm:mt-5 sm:block sm:max-w-xl sm:text-[0.9375rem] md:text-[1rem]"
          >
            {slide.sub}
          </p>

          <div
            style={{
              opacity: leaving ? 0 : 1,
              transition: "opacity 0.5s ease 0.15s",
            }}
            className="mt-4 flex w-full flex-col gap-2.5 max-md:mx-auto max-md:max-w-[22rem] max-md:flex-row max-md:gap-2.5 sm:mt-8 sm:w-auto sm:flex-row sm:gap-4"
          >
            <Link
              href={primaryCta.href}
              className="flex h-11 min-h-[44px] flex-1 items-center justify-center rounded-md bg-site-brand px-3 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-white shadow-[0_10px_28px_-8px_rgba(243,112,33,0.32)] transition-colors hover:bg-site-brand-hover sm:h-11 sm:flex-none sm:px-7 sm:text-[10px] sm:tracking-[0.22em]"
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className="flex h-11 min-h-[44px] flex-1 items-center justify-center rounded-sm border border-[rgb(232_104_42/0.55)] bg-[rgb(232_104_42/0.10)] px-3 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.1em] text-[#fff4eb] transition-colors hover:border-[rgb(232_104_42/0.85)] hover:bg-[rgb(232_104_42/0.2)] sm:h-11 sm:flex-none sm:px-5 sm:text-[10px] sm:tracking-[0.2em]"
            >
              {secondaryCta.label} <span className="ml-0.5">→</span>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-3 flex items-center gap-3 pb-[env(safe-area-inset-bottom)] max-md:left-1/2 max-md:-translate-x-1/2 sm:bottom-10 sm:left-14 sm:translate-x-0 lg:left-24">
          {safeSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setLeaving(true);
                setTimeout(() => {
                  setCurrent(idx);
                  setLeaving(false);
                }, 600);
              }}
              aria-label={`${idx + 1}. slajd`}
              className={[
                "transition-all duration-500",
                idx === current
                  ? "h-0.5 w-10 rounded-full bg-site-brand shadow-[0_0_12px_rgba(232,104,42,0.85)]"
                  : "h-px w-5 bg-[rgb(255_200_170/0.55)] hover:bg-[rgb(255_214_190/0.9)]",
              ].join(" ")}
            />
          ))}
        </div>

        <div className="absolute bottom-8 right-6 hidden flex-col items-center gap-3 sm:right-14 sm:flex lg:right-24">
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#ffd4bc] [text-shadow:0_1px_4px_rgba(0,0,0,0.75),0_0_14px_rgba(232,104,42,0.35)]">scroll</span>
          <div className="h-14 w-px bg-gradient-to-b from-[rgb(232_104_42/0.45)] to-transparent" />
        </div>
      </div>
    </section>
  );
}
