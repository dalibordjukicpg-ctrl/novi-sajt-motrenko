"use client";

import Link from "next/link";

import { BookingIntakeForm } from "@/components/site/booking-intake-form";
import { FadeIn } from "@/components/site/fade-in";
import type { Locale } from "@/lib/i18n";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import { formatHoursDisplay } from "@/lib/format-hours-display";
import type { SiteStringKey } from "@/lib/site-fields";

function telFromDisplay(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return undefined;
  if (digits.startsWith("382")) return `tel:+${digits}`;
  return `tel:+382${digits.replace(/^0+/, "")}`;
}

type Props = {
  locale: Locale;
  privacyHref: string;
  s: Record<SiteStringKey, string>;
  eyebrow: string;
  headingLine1: string;
  headingLine2: string;
};

export function HomeCtaMotrenko({
  locale,
  privacyHref,
  s,
  eyebrow,
  headingLine1,
  headingLine2,
}: Props) {
  const href1 = telFromDisplay(s["contact.phone1"]);
  const href2 = telFromDisplay(s["contact.phone2"]);

  return (
    <section
      id="kontakt"
      className="site-section site-section-scrim-md relative z-10 scroll-mt-24 overflow-x-hidden py-section-y"
    >
      {/* Peach orb desno — premium glow iza CTA */}
      <div
        className="site-ambient-orb-warm absolute -right-[15%] top-[20%] h-[min(36rem,48vw)] w-[min(36rem,48vw)] opacity-60"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-16">
        <FadeIn className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12 xl:gap-14">
          <div className="min-w-0 flex-1 space-y-7 text-center sm:text-left">
            <div>
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-site-brand">
                {eyebrow}
              </p>
              <h2
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                className="text-[clamp(2.2rem,4.5vw,4.25rem)] font-light leading-[1.06] tracking-tight text-site-ink"
              >
                {headingLine1}
                <br />
                <em className="not-italic text-site-subtle">{headingLine2}</em>
              </h2>
            </div>

            <div className="mx-auto flex w-full max-w-lg flex-wrap justify-center gap-3 sm:mx-0 sm:justify-start">
              <Link
                href={resolvePublicHref(locale, s["header.cta_book_href"])}
                className="site-btn-primary h-12 min-h-[48px] flex-1 px-6 text-[11px] tracking-[0.22em] min-[380px]:flex-none min-[380px]:px-8"
              >
                {s["header.cta_book"]}
              </Link>
              <a
                href={`mailto:${s["contact.email"]}`}
                className="site-card-glass inline-flex h-12 min-h-[48px] flex-1 items-center justify-center px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-site-muted transition-all duration-300 hover:text-site-ink min-[380px]:flex-none min-[380px]:px-8"
              >
                {s["contact.email"]}
              </a>
            </div>

            <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-x-8 gap-y-3 text-[11px] font-medium uppercase tracking-[0.18em] text-site-subtle sm:mx-0 sm:justify-start">
              <span>
                {s["home.hours_mon_fri_label"]}{" "}
                {formatHoursDisplay(s["hours.mon_fri"])}
              </span>
              <span>
                {s["home.hours_sat_sun_label"]}{" "}
                {formatHoursDisplay(s["hours.sat"])} /{" "}
                {formatHoursDisplay(s["hours.sun"])}
              </span>
              {href1 ? (
                <a
                  href={href1}
                  className="transition-colors hover:text-site-brand"
                >
                  {s["contact.phone1"]}
                </a>
              ) : null}
              {href2 ? (
                <a
                  href={href2}
                  className="transition-colors hover:text-site-brand"
                >
                  {s["contact.phone2"]}
                </a>
              ) : null}
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-[min(100%,30rem)] xl:w-[min(100%,34rem)]">
            <BookingIntakeForm
              locale={locale}
              privacyHref={privacyHref}
              callDisplay={s["contact.phone1"]}
              callHref={href1}
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
