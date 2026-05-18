"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { FadeIn } from "@/components/site/fade-in";
import { DEFAULT_HEADER_LOGO } from "@/lib/clinic-assets";
import type { Locale } from "@/lib/i18n";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import { formatHoursDisplay } from "@/lib/format-hours-display";
import type { SiteStringKey } from "@/lib/site-fields";

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  footerContactHref: string | null;
  logoUrl?: string | null;
};

const COL_TITLE =
  "mb-7 min-h-[1.25rem] text-[11px] font-semibold uppercase leading-none tracking-[0.3em] text-site-brand";

const FOOTER_DAY_LABELS = [
  "Ponedjeljak",
  "Utorak",
  "Srijeda",
  "Četvrtak",
  "Petak",
  "Subota",
  "Nedjelja",
] as const;

function telHref(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `tel:${digits}` : `tel:${digits}`;
}

/** Jednake „premium“ pločice za ikone kroz cijeli footer. */
function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-site-border bg-site-card text-site-brand shadow-site-card">
      {children}
    </span>
  );
}

function FooterAccordionSection({
  title,
  children,
  className = "",
  alignEnd = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  alignEnd?: boolean;
}) {
  const summaryClasses = `${COL_TITLE} mb-0 list-none cursor-pointer px-4 py-4 [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2`;
  const bodyClasses =
    "border-t border-site-line px-4 pb-4 pt-3 md:border-0 md:px-0 md:pb-0 md:pt-0";

  const titleDesk = alignEnd ? `${COL_TITLE} md:text-right` : COL_TITLE;
  const deskWrap = alignEnd ? "md:text-right" : "";

  return (
    <div className={className}>
      <div className={`hidden md:block ${deskWrap}`}>
        <p className={titleDesk}>{title}</p>
        {children}
      </div>

      <details className="group rounded-xl border border-site-border bg-site-card shadow-site-card md:hidden">
        <summary className={summaryClasses}>
          <span>{title}</span>
          <span className="text-site-brand transition-transform group-open:rotate-180">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M2 4l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          </span>
        </summary>
        <div className={bodyClasses}>{children}</div>
      </details>
    </div>
  );
}

export function SiteFooter({
  locale,
  s,
  footerContactHref,
  logoUrl,
}: Props) {
  const resolvedLogo = logoUrl?.trim() || DEFAULT_HEADER_LOGO;

  const hourSlots = [
    s["hours.mon_fri"],
    s["hours.tuesday"],
    s["hours.mon_fri"],
    s["hours.mon_fri"],
    s["hours.mon_fri"],
    s["hours.sat"],
    s["hours.sun"],
  ];

  const mapsHref = (s["contact.maps_href"] ?? "").trim();
  const mapsIsUrl =
    mapsHref.startsWith("http://") || mapsHref.startsWith("https://");

  const siteHref = (s["footer.site_domain_href"] ?? "").trim();
  const siteLabel = (s["footer.site_domain_label"] ?? "").trim();
  const siteIsExternal =
    siteHref.startsWith("http://") || siteHref.startsWith("https://");

  const primaryPhone = (s["contact.phone1"] ?? "").trim();
  const secondaryPhone = (s["contact.phone2"] ?? "").trim();
  const email = (s["contact.email"] ?? "").trim();
  const address = (s["contact.address"] ?? "").trim();

  const socialItems = (
    [
      { label: "Facebook" as const, href: (s["social.facebook"] ?? "").trim() },
      {
        label: "Instagram" as const,
        href: (s["social.instagram"] ?? "").trim(),
      },
      { label: "LinkedIn" as const, href: (s["social.linkedin"] ?? "").trim() },
    ] as const
  ).filter((x) => x.href.startsWith("http://") || x.href.startsWith("https://"));

  const closedLabel = s["footer.closed"];
  const kontaktHref =
    footerContactHref ?? resolvePublicHref(locale, "/s/kontakt");

  return (
    <footer
      id="contact"
      className="site-footer-motrenko relative z-30 shrink-0 overflow-hidden bg-[rgb(240_234_226/0.92)] text-zinc-800 backdrop-blur-sm selection:bg-site-brand selection:text-white"
    >
      {/* Mekani prelaz iz sadržaja u footer — bez oštrog ruba */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent to-transparent" />

      <div className="mx-auto max-w-7xl px-6 lg:px-14">
        <FadeIn>
          <div className="border-b border-site-line py-16 lg:py-[4.5rem]">
            <div
              className={[
                "grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-y-14 md:gap-x-0",
                "lg:grid-cols-4 lg:gap-y-0",
              ].join(" ")}
            >
              <FooterAccordionSection
                title={s["footer.hours_title"]}
                className="md:min-w-0 lg:border-r lg:border-site-line lg:pr-8 xl:pr-10"
              >
                <div className="space-y-0">
                  {FOOTER_DAY_LABELS.map((day, i) => {
                    const time = formatHoursDisplay(hourSlots[i] ?? "");
                    const closed = time === closedLabel;
                    return (
                      <div
                        key={day}
                        className="flex items-baseline justify-between gap-4 border-b border-site-line py-2.5 text-[14px] last:border-b-0 last:pb-0"
                      >
                        <span className="text-zinc-600">{day}</span>
                        <span
                          className={
                            closed
                              ? "shrink-0 text-right text-[12px] text-zinc-500"
                              : "shrink-0 text-right tabular-nums font-medium text-zinc-900"
                          }
                        >
                          {time || "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </FooterAccordionSection>

              <FooterAccordionSection
                title={s["footer.social_title"]}
                className="md:min-w-0 lg:border-r lg:border-site-line lg:px-8 xl:px-10"
              >
                {socialItems.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {socialItems.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3.5 text-[14px] text-zinc-800 transition-colors hover:text-site-brand"
                      >
                        <IconTile>
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3.5 w-3.5"
                          >
                            {item.label === "Facebook" && (
                              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                            )}
                            {item.label === "Instagram" && (
                              <>
                                <rect
                                  x="2"
                                  y="2"
                                  width="20"
                                  height="20"
                                  rx="5"
                                  ry="5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                                <path
                                  d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                                <line
                                  x1="17.5"
                                  y1="6.5"
                                  x2="17.51"
                                  y2="6.5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </>
                            )}
                            {item.label === "LinkedIn" && (
                              <>
                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                                <circle cx="4" cy="4" r="2" />
                              </>
                            )}
                          </svg>
                        </IconTile>
                        {item.label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] leading-relaxed text-zinc-700">
                    Unesite URL društvenih mreža u admin panelu (Header i footer).
                  </p>
                )}
              </FooterAccordionSection>

              <FooterAccordionSection
                title={s["footer.col_contact"]}
                className="md:min-w-0 lg:border-r lg:border-site-line lg:px-8 xl:px-10"
              >
                <div className="space-y-5">
                  {primaryPhone ? (
                    <a
                      href={telHref(primaryPhone)}
                      className="group flex items-start gap-3.5 text-[14px] transition-colors hover:text-site-brand"
                    >
                      <IconTile>
                        <Phone size={15} strokeWidth={1.5} aria-hidden />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                          Telefon
                        </span>
                        <span className="text-zinc-900 font-medium transition group-hover:text-site-brand">
                          {primaryPhone}
                        </span>
                      </span>
                    </a>
                  ) : null}

                  {secondaryPhone && secondaryPhone !== primaryPhone ? (
                    <a
                      href={telHref(secondaryPhone)}
                      className="group flex items-start gap-3.5 text-[14px] transition-colors hover:text-site-brand"
                    >
                      <IconTile>
                        <Phone size={15} strokeWidth={1.5} aria-hidden />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                          Telefon 2
                        </span>
                        <span className="text-zinc-900 font-medium transition group-hover:text-site-brand">
                          {secondaryPhone}
                        </span>
                      </span>
                    </a>
                  ) : null}

                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="group flex items-start gap-3.5 break-all text-[14px] transition-colors hover:text-site-brand"
                    >
                      <IconTile>
                        <Mail size={15} strokeWidth={1.5} aria-hidden />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                          Email
                        </span>
                        <span className="text-zinc-900 font-medium transition group-hover:text-site-brand">
                          {email}
                        </span>
                      </span>
                    </a>
                  ) : (
                    <p className="text-[14px] text-zinc-700">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                        Email
                      </span>
                      <span className="italic">Unijeti u admin (Header i footer).</span>
                    </p>
                  )}

                  {address ? (
                    mapsIsUrl ? (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3.5 text-[14px] transition-colors hover:text-site-brand"
                      >
                        <IconTile>
                          <MapPin size={15} strokeWidth={1.5} aria-hidden />
                        </IconTile>
                        <span className="min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                            Adresa
                          </span>
                          <span className="text-zinc-900 font-medium transition group-hover:text-site-brand">
                            {address}
                          </span>
                          <span className="mt-1.5 inline-block text-[11px] font-medium uppercase tracking-[0.18em] text-site-brand transition group-hover:text-site-brand-muted">
                            Google Maps →
                          </span>
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-start gap-3.5 text-[14px] text-zinc-800">
                        <IconTile>
                          <MapPin size={15} strokeWidth={1.5} aria-hidden />
                        </IconTile>
                        <span className="min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                            Adresa
                          </span>
                          {address}
                        </span>
                      </div>
                    )
                  ) : (
                    <p className="text-[14px] text-zinc-700">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                        Adresa
                      </span>
                      <span className="italic">Unijeti u admin panelu.</span>
                    </p>
                  )}

                  {siteLabel && siteIsExternal ? (
                    <a
                      href={siteHref}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start gap-3.5 text-[14px] transition-colors hover:text-site-brand"
                    >
                      <IconTile>
                        <ExternalLink size={15} strokeWidth={1.5} aria-hidden />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                          Web
                        </span>
                        <span className="text-zinc-900 font-medium transition group-hover:text-site-brand">
                          {siteLabel}
                        </span>
                      </span>
                    </a>
                  ) : null}

                  <div className="pt-1">
                    <Link
                      href={kontaktHref}
                      className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-site-brand transition hover:text-site-brand-muted"
                    >
                      Kontakt stranica
                      <span aria-hidden className="text-[12px] font-light">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </FooterAccordionSection>

              <FooterAccordionSection
                title={s["footer.col_clinic"]}
                alignEnd={true}
                className="md:min-w-0 md:col-span-2 lg:col-span-1 lg:pl-8 xl:pl-10"
              >
                <div className="space-y-5 md:flex md:flex-col md:items-end">
                  <div className="md:text-right">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedLogo}
                      alt={s["org.brand"]}
                      className="h-[4.65rem] w-auto max-w-[258px] object-contain object-right drop-shadow-[0_1px_10px_rgba(0,0,0,0.06)] sm:h-[5rem] sm:max-w-[276px]"
                    />
                  </div>
                  <p
                    style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                    className="max-w-[18.5rem] text-[14px] font-semibold uppercase tracking-[0.14em] text-site-ink md:text-right"
                  >
                    {s["org.brand"]}
                  </p>
                  <p className="max-w-[18.5rem] text-[14px] leading-[1.75] text-zinc-800 md:text-right">
                    {s["footer.about_body"]}
                  </p>
                </div>
              </FooterAccordionSection>
            </div>
          </div>
        </FadeIn>

        <div className="flex flex-col items-stretch gap-5 py-8 text-[13px] leading-relaxed text-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:gap-8 lg:py-9">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} {s["footer.copyright"]}
          </p>
          <p className="text-center sm:text-left">
            {s["footer.crafted"]}{" "}
            <span className="font-medium text-site-brand">{s["footer.crafted_by"]}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 sm:justify-end">
            <Link
              href={resolvePublicHref(locale, s["footer.privacy_href"])}
              className="font-medium text-zinc-900 underline-offset-4 transition-colors hover:text-site-brand hover:underline"
            >
              {s["footer.privacy"]}
            </Link>
            <Link
              href={resolvePublicHref(locale, s["footer.terms_href"])}
              className="font-medium text-zinc-900 underline-offset-4 transition-colors hover:text-site-brand hover:underline"
            >
              {s["footer.terms"]}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
