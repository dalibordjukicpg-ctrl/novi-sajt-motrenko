import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";

import { DEFAULT_HEADER_LOGO } from "@/lib/clinic-assets";
import type { Locale } from "@/lib/i18n";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import { formatHoursDisplay } from "@/lib/format-hours-display";
import { formatPhoneDisplay, telHrefMontenegro } from "@/lib/phone-format";
import type { SiteStringKey } from "@/lib/site-fields";

const CRAFTED_BY_HREF = "https://www.computer-doctor.me";

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  footerContactHref?: string | null;
  logoUrl?: string | null;
};

const COL_TITLE =
  "mb-5 text-[11px] font-semibold uppercase leading-snug tracking-[0.22em] text-site-brand";

const FOOTER_DAY_LABELS = [
  "Ponedjeljak",
  "Utorak",
  "Srijeda",
  "Četvrtak",
  "Petak",
  "Subota",
  "Nedjelja",
] as const;

function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-site-border bg-site-card text-site-brand shadow-site-card">
      {children}
    </span>
  );
}

function FooterSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className={COL_TITLE}>{title}</h2>
      {children}
    </section>
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

  const socialItems = (
    [
      { label: "Facebook" as const, href: (s["social.facebook"] ?? "").trim() },
      {
        label: "Instagram" as const,
        href: (s["social.instagram"] ?? "").trim(),
      },
      { label: "YouTube" as const, href: (s["social.youtube"] ?? "").trim() },
      { label: "LinkedIn" as const, href: (s["social.linkedin"] ?? "").trim() },
    ] as const
  ).filter((x) => x.href.startsWith("http://") || x.href.startsWith("https://"));

  const closedLabel = s["footer.closed"];

  const mapsHref = (s["contact.maps_href"] ?? "").trim();
  const mapsIsUrl =
    mapsHref.startsWith("http://") || mapsHref.startsWith("https://");

  const primaryPhone = formatPhoneDisplay((s["contact.phone1"] ?? "").trim());
  const secondaryPhone = formatPhoneDisplay((s["contact.phone2"] ?? "").trim());
  const primaryTel = telHrefMontenegro(s["contact.phone1"] ?? "");
  const secondaryTel = telHrefMontenegro(s["contact.phone2"] ?? "");
  const email = (s["contact.email"] ?? "").trim();
  const address = (s["contact.address"] ?? "").trim();
  const tagline = (s["footer.tagline"] ?? "").trim();
  const kontaktHref =
    footerContactHref ?? resolvePublicHref(locale, "/s/kontakt");
  const bookHref = resolvePublicHref(locale, s["header.cta_book_href"] || "#kontakt");

  return (
    <footer
      id="contact"
      className="site-footer-motrenko relative z-30 shrink-0 overflow-hidden bg-[rgb(240_234_226/0.92)] text-zinc-800 backdrop-blur-sm selection:bg-site-brand selection:text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent to-transparent" />

      <div className="mx-auto max-w-7xl px-6 lg:px-14">
          <div className="border-b border-site-line py-14 lg:py-16">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-10 md:gap-y-12 lg:grid-cols-12 lg:items-start lg:gap-x-8 xl:gap-x-10">
              <FooterSection
                title={s["footer.hours_title"]}
                className="md:min-w-0 lg:col-span-3"
              >
                <div className="divide-y divide-site-line/80">
                  {FOOTER_DAY_LABELS.map((day, i) => {
                    const time = formatHoursDisplay(hourSlots[i] ?? "");
                    const closed = time === closedLabel;
                    return (
                      <div
                        key={day}
                        className="flex items-center justify-between gap-3 py-2 text-[13px] first:pt-0 last:pb-0"
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
              </FooterSection>

              <FooterSection
                title={s["footer.social_title"]}
                className="md:min-w-0 lg:col-span-2"
              >
                {socialItems.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {socialItems.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 text-[13px] text-zinc-800 transition-colors hover:text-site-brand"
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
                            {item.label === "YouTube" && (
                              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.42a2.78 2.78 0 0 0-1.95 2C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.95 2C5.12 20 12 20 12 20s6.88 0 8.59-.42a2.78 2.78 0 0 0 1.95-2C23 15.87 23 12 23 12s0-3.87-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
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
                    Unesite URL u adminu: Footer i kontakt → Društvene mreže.
                  </p>
                )}
              </FooterSection>

              <FooterSection
                title={s["footer.col_contact"]}
                className="md:min-w-0 lg:col-span-4"
              >
                <div className="space-y-4">
                  {tagline ? (
                    <p className="text-[13px] leading-relaxed text-zinc-700">{tagline}</p>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {primaryPhone && primaryTel ? (
                    <a
                      href={primaryTel}
                      className="group flex items-start gap-3 text-[13px] transition-colors hover:text-site-brand"
                    >
                      <IconTile>
                        <Phone size={15} strokeWidth={1.5} aria-hidden />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Telefon
                        </span>
                        <span className="font-medium text-zinc-900 transition group-hover:text-site-brand">
                          {primaryPhone}
                        </span>
                      </span>
                    </a>
                  ) : null}

                  {secondaryPhone && secondaryPhone !== primaryPhone && secondaryTel ? (
                    <a
                      href={secondaryTel}
                      className="group flex items-start gap-3 text-[13px] transition-colors hover:text-site-brand"
                    >
                      <IconTile>
                        <Phone size={15} strokeWidth={1.5} aria-hidden />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Mobilni
                        </span>
                        <span className="font-medium text-zinc-900 transition group-hover:text-site-brand">
                          {secondaryPhone}
                        </span>
                      </span>
                    </a>
                  ) : null}

                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="group flex items-start gap-3 break-all text-[13px] transition-colors hover:text-site-brand sm:col-span-2 lg:col-span-1 xl:col-span-2"
                    >
                      <IconTile>
                        <Mail size={15} strokeWidth={1.5} aria-hidden />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Email
                        </span>
                        <span className="font-medium text-zinc-900 transition group-hover:text-site-brand">
                          {email}
                        </span>
                      </span>
                    </a>
                  ) : null}
                  </div>

                  {address ? (
                    mapsIsUrl ? (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3 text-[13px] transition-colors hover:text-site-brand"
                      >
                        <IconTile>
                          <MapPin size={15} strokeWidth={1.5} aria-hidden />
                        </IconTile>
                        <span className="min-w-0">
                          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Adresa
                          </span>
                          <span className="block font-medium leading-snug text-zinc-900 transition group-hover:text-site-brand">
                            {address}
                          </span>
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-site-brand">
                            Google Maps
                            <span aria-hidden>→</span>
                          </span>
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-start gap-3 text-[13px] text-zinc-800">
                        <IconTile>
                          <MapPin size={15} strokeWidth={1.5} aria-hidden />
                        </IconTile>
                        <span className="min-w-0">
                          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Adresa
                          </span>
                          {address}
                        </span>
                      </div>
                    )
                  ) : null}

                  <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap lg:flex-col xl:flex-row">
                    <Link
                      href={bookHref}
                      className="site-btn-primary inline-flex h-10 flex-1 items-center justify-center px-5 text-[10px] tracking-[0.2em] sm:min-w-[9.5rem] lg:flex-none xl:flex-1"
                    >
                      {s["header.cta_book"]}
                    </Link>
                    <Link
                      href={kontaktHref}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-site-border bg-site-card px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-site-brand shadow-site-card transition hover:border-site-brand/30 hover:text-site-brand-muted sm:min-w-[9.5rem] lg:flex-none xl:flex-1"
                    >
                      Kontakt forma
                    </Link>
                  </div>
                </div>
              </FooterSection>

              <FooterSection
                title={s["footer.col_clinic"]}
                className="md:min-w-0 md:col-span-2 lg:col-span-3"
              >
                <div className="space-y-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedLogo}
                    alt={s["org.brand"]}
                    className="h-[4.25rem] w-auto max-w-[240px] object-contain object-left drop-shadow-[0_1px_10px_rgba(0,0,0,0.06)]"
                  />
                  <p
                    style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                    className="text-[13px] font-semibold uppercase leading-snug tracking-[0.12em] text-site-ink"
                  >
                    {s["org.brand"]}
                  </p>
                  <p className="text-[13px] leading-[1.7] text-zinc-700">
                    {s["footer.about_body"]}
                  </p>
                </div>
              </FooterSection>
            </div>
          </div>

        <div className="grid grid-cols-1 gap-6 py-8 text-[13px] leading-relaxed text-zinc-800 lg:grid-cols-3 lg:items-center lg:gap-8 lg:py-9">
          <p className="text-center lg:text-left">
            © {new Date().getFullYear()} {s["footer.copyright"]}
          </p>
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <span className="text-[12px] tracking-wide text-zinc-600">
              {s["footer.crafted"]}
            </span>
            <a
              href={CRAFTED_BY_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center rounded-full border border-site-brand/25 bg-gradient-to-br from-white via-[#fffaf6] to-[#ffefe3] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-site-brand shadow-[0_2px_14px_-6px_rgba(243,112,33,0.45),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-sm transition duration-200 hover:-translate-y-px hover:border-site-brand/45 hover:from-white hover:to-[#ffe8d9] hover:shadow-[0_6px_20px_-8px_rgba(243,112,33,0.55)]"
            >
              <span className="relative">
                {s["footer.crafted_by"]}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 rounded-full bg-site-brand/0 transition group-hover:bg-site-brand/[0.04]"
                />
              </span>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 lg:justify-end">
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
