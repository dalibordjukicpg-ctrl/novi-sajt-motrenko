import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Calendar, MapPin, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";

import { HeroMotionLayer } from "@/components/site/hero-banner-motion-layer";
import { HERO_VIDEO_EXTENSIONS } from "@/lib/hero-background-media";

export type HeroBannerCardIcon = "booking" | "services" | "location";

export type HeroBannerCard = {
  title: string;
  description: string;
  icon?: HeroBannerCardIcon;
};

export type HeroBannerProps = {
  /** Slika ili video; ako je prazno, koristi se tamni gradijent. */
  backgroundUrl?: string | null;
  backgroundType?: "auto" | "image" | "video";
  /** Običan naslov (ako nema `titleSlot`). */
  title?: string;
  /** Zamjena za cijeli H1 (npr. rotirajući podnaslovi). */
  titleSlot?: ReactNode;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  cards?: HeroBannerCard[];
  iconMap?: Partial<Record<HeroBannerCardIcon, LucideIcon>>;
  className?: string;
  /** Spori zoom/pomjeraj (Ken Burns) + parallax kao na embryolab.eu */
  backgroundMotion?: boolean;
  /** Jačina parallaxa pri skrolu (0 = samo drift animacija). */
  parallaxIntensity?: number;
  imageAlt?: string;
};

const defaultCards: HeroBannerCard[] = [
  {
    icon: "booking",
    title: "Zakazivanje",
    description: "Brz kontakt i termini prilagođeni vašem rasporedu.",
  },
  {
    icon: "services",
    title: "Usluge",
    description: "Savremena reproduktivna medicina na jednom mjestu.",
  },
  {
    icon: "location",
    title: "Lokacija",
    description: "Budva — lako dostupno i diskretno.",
  },
];

const defaultIconMap: Record<HeroBannerCardIcon, LucideIcon> = {
  booking: Calendar,
  services: Stethoscope,
  location: MapPin,
};

function isVideoUrl(url: string, type: HeroBannerProps["backgroundType"]): boolean {
  if (type === "video") return true;
  if (type === "image") return false;
  return HERO_VIDEO_EXTENSIONS.test(url);
}

function BackgroundMedia({
  backgroundUrl,
  backgroundType,
  imageAlt,
}: Pick<HeroBannerProps, "backgroundUrl" | "backgroundType" | "imageAlt">) {
  const url = backgroundUrl?.trim() ?? "";
  if (!url) return null;

  const isVideo = isVideoUrl(url, backgroundType ?? "auto");

  if (isVideo) {
    return (
      <div className="relative h-full w-full">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden={true}
        >
          <source src={url} />
        </video>
      </div>
    );
  }

  const isLocal = url.startsWith("/");

  return (
    <div className="relative h-full w-full">
      <Image
        src={url}
        alt={imageAlt ?? ""}
        fill
        priority
        sizes="100vw"
        className="object-cover"
        unoptimized={!isLocal}
      />
    </div>
  );
}

/**
 * Premium hero — tamno-plavi overlay, bijeli tekst, narandžasta dugmad (`bg-orange-600`).
 */
export function HeroBanner({
  backgroundUrl,
  backgroundType = "auto",
  title,
  titleSlot,
  subtitle,
  primaryCta,
  secondaryCta,
  cards,
  iconMap,
  className = "",
  imageAlt,
  backgroundMotion = true,
  parallaxIntensity = 0.34,
}: HeroBannerProps) {
  const resolvedCards = cards?.length ? cards : defaultCards;
  const icons: Record<HeroBannerCardIcon, LucideIcon> = {
    ...defaultIconMap,
    ...iconMap,
  };

  const hasMedia = Boolean(backgroundUrl?.trim());

  return (
    <section
      className={`relative isolate flex min-h-[min(92vh,52rem)] flex-col justify-end overflow-hidden md:min-h-[min(88vh,48rem)] ${className}`}
    >
      <div className="absolute inset-0 z-0 min-h-[min(92vh,52rem)] md:min-h-[min(88vh,48rem)]">
        {/* Kad nema slike/videa — uvijek vidljiva tamna pozadina */}
        <div
          className={
            hasMedia
              ? "absolute inset-0 bg-slate-900"
              : "absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950"
          }
          aria-hidden={true}
        />
        {hasMedia && backgroundMotion ? (
          <HeroMotionLayer parallaxIntensity={parallaxIntensity}>
            <div className="absolute left-[-14%] top-[-14%] h-[128%] w-[128%] motion-safe:animate-hero-drift motion-safe:will-change-transform">
              <BackgroundMedia
                backgroundUrl={backgroundUrl}
                backgroundType={backgroundType}
                imageAlt={imageAlt}
              />
            </div>
          </HeroMotionLayer>
        ) : hasMedia ? (
          <div className="absolute inset-0">
            <BackgroundMedia
              backgroundUrl={backgroundUrl}
              backgroundType={backgroundType}
              imageAlt={imageAlt}
            />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-blue-950/60" aria-hidden={true} />
        <div
          className="absolute inset-0 bg-gradient-to-t from-blue-950/85 via-blue-950/35 to-blue-950/20"
          aria-hidden={true}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-28 md:px-6 md:pb-14 md:pt-32">
        <div className="max-w-3xl text-left md:max-w-4xl">
          {titleSlot ? (
            titleSlot
          ) : (
            <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
              {title ?? ""}
            </h1>
          )}
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
            {subtitle}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center justify-center rounded-full bg-orange-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-500 hover:shadow-orange-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex items-center justify-center rounded-full border-2 border-white bg-transparent px-8 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white hover:text-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="relative z-20 -mb-16 mt-14 grid gap-4 sm:grid-cols-2 md:-mb-20 lg:mt-16 lg:grid-cols-3 lg:gap-6">
          {resolvedCards.slice(0, 3).map((card, i) => {
            const fallbackIcons: HeroBannerCardIcon[] = [
              "booking",
              "services",
              "location",
            ];
            const key = card.icon ?? fallbackIcons[i % 3];
            const Icon = icons[key] ?? Calendar;
            return (
              <div
                key={`${card.title}-${i}`}
                className="flex gap-4 rounded-2xl border border-white/20 bg-white/10 px-5 py-5 shadow-xl shadow-blue-950/20 backdrop-blur-md md:px-6 md:py-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-orange-500 ring-1 ring-white/25">
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden={true} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{card.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/80">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
