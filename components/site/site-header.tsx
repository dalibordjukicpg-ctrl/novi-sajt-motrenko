"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, Phone, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { PublicNavItem } from "@/lib/queries/site";
import { DEFAULT_HEADER_LOGO, HEADER_LOGO_PIXEL_HEIGHT, HEADER_LOGO_PIXEL_WIDTH } from "@/lib/clinic-assets";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import type { SiteStringKey } from "@/lib/site-fields";
import {
  looksLikeUslugeParent,
  matchNavNodeToUslugeGroupKey,
  USLUGE_NAV_GROUP_ORDER,
} from "@/lib/site-page-header-nav";
import { SiteLanguageSwitcher } from "@/components/site/site-language-switch";

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  nav: PublicNavItem[];
  logoUrl?: string | null;
};

/** Outfit (header-nav): čitljiv caps na bijeloj traci; miran tracking. */
const navLinkBase =
  "whitespace-nowrap font-header-nav text-[12px] font-semibold uppercase tracking-[0.11em] antialiased transition md:text-[13px] md:tracking-[0.12em] lg:text-[14px] lg:tracking-[0.12em]";

function navItemHasNestedChildren(item: PublicNavItem): boolean {
  return item.children.some((c) => c.children.length > 0);
}

function sortPillarsLikeMegaMenu(pillars: PublicNavItem[]): PublicNavItem[] {
  const rank = new Map(USLUGE_NAV_GROUP_ORDER.map((k, i) => [k, i]));
  return [...pillars].sort((a, b) => {
    const ka = matchNavNodeToUslugeGroupKey(a) ?? "";
    const kb = matchNavNodeToUslugeGroupKey(b) ?? "";
    return (rank.get(ka) ?? 99) - (rank.get(kb) ?? 99);
  });
}

function expandNavForMobilePanel(nav: PublicNavItem[]): PublicNavItem[] {
  const out: PublicNavItem[] = [];
  for (const item of nav) {
    if (looksLikeUslugeParent(item) && item.children.length > 0) {
      for (const c of sortPillarsLikeMegaMenu(item.children)) {
        out.push(c);
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

/** Tri kolone mega menija */
const USLUGE_MEGA_COLUMN_KEYS: readonly (readonly string[])[] = [
  ["infertilitet", "trudnoca"],
  ["iui_ivf"],
  ["ginekologija", "prezervacija"],
];

function bucketUslugePillarsForMegaMenu(pillars: PublicNavItem[]): PublicNavItem[][] {
  const byKey = new Map<string, PublicNavItem>();
  const unmatched: PublicNavItem[] = [];
  for (const p of pillars) {
    const k = matchNavNodeToUslugeGroupKey(p);
    if (k) byKey.set(k, p);
    else unmatched.push(p);
  }
  const cols = USLUGE_MEGA_COLUMN_KEYS.map((keys) =>
    keys.map((k) => byKey.get(k)).filter((node): node is PublicNavItem => node != null),
  );
  for (const p of unmatched) cols[2]!.push(p);
  return cols;
}

// ─── Premium Mobile Accordion ─────────────────────────────────────────────────

function MobileAccordionItem({
  item,
  locale,
  onNavigate,
}: {
  item: PublicNavItem;
  locale: Locale;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-zinc-100/80 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-6 py-[1.05rem] text-left transition-colors hover:bg-zinc-50/60 active:bg-zinc-50"
      >
        <span className="font-header-nav text-[13px] font-semibold uppercase tracking-[0.13em] text-zinc-800">
          {item.label}
        </span>
        {/* Animated chevron in brand pill */}
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            "border border-site-brand/25 bg-site-brand/[0.06]",
            "text-site-brand transition-transform duration-300",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
        </span>
      </button>

      {/* Smooth accordion via CSS grid trick */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="mx-5 mb-3 overflow-hidden rounded-xl border border-zinc-100 bg-[#faf8f6]">
            {item.children.map((sub, i) => (
              <Link
                key={sub.id}
                href={resolvePublicHref(locale, sub.href)}
                onClick={onNavigate}
                className={[
                  "group flex items-center gap-3 px-4 py-3 transition-colors",
                  "hover:bg-white hover:text-site-brand active:bg-white/60",
                  i < item.children.length - 1
                    ? "border-b border-zinc-100/80"
                    : "",
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-site-brand/30 transition-colors group-hover:bg-site-brand" />
                <span className="font-sans text-[13.5px] font-normal leading-snug text-zinc-600 group-hover:text-site-brand">
                  {sub.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Premium Mobile Nav Sections ──────────────────────────────────────────────

function MobileNavSections({
  nav,
  locale,
  s,
  onNavigate,
}: {
  nav: PublicNavItem[];
  locale: Locale;
  s: Record<SiteStringKey, string>;
  onNavigate: () => void;
}) {
  const searchHref = (s["header.nav_search_href"] ?? "").trim() || "/";
  const searchLabel = (s["header.nav_search_label"] ?? "").trim() || "Pretraga";
  const rows = expandNavForMobilePanel(nav);

  return (
    <div className="flex flex-col">
      {/* Nav list */}
      <nav aria-label="Mobilna navigacija" className="flex flex-col">
        {rows.map((item) =>
          item.children.length === 0 ? (
            <Link
              key={item.id}
              href={resolvePublicHref(locale, item.href)}
              onClick={onNavigate}
              className="flex items-center border-b border-zinc-100/80 px-6 py-[1.05rem] font-header-nav text-[13px] font-semibold uppercase tracking-[0.13em] text-zinc-800 transition-colors hover:bg-zinc-50/60 hover:text-site-brand last:border-b-0 active:bg-zinc-50"
            >
              {item.label}
            </Link>
          ) : (
            <MobileAccordionItem
              key={item.id}
              item={item}
              locale={locale}
              onNavigate={onNavigate}
            />
          ),
        )}
      </nav>

      {/* Search row */}
      <Link
        href={resolvePublicHref(locale, searchHref)}
        onClick={onNavigate}
        className="group mx-5 mt-3 flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-3 transition-colors hover:border-site-brand/30 hover:bg-white hover:text-site-brand"
      >
        <Search
          className="h-4 w-4 shrink-0 text-zinc-400 transition-colors group-hover:text-site-brand"
          strokeWidth={2}
          aria-hidden
        />
        <span className="font-sans text-[13px] font-medium text-zinc-500 group-hover:text-site-brand">
          {searchLabel}
        </span>
      </Link>
    </div>
  );
}

// ─── Desktop NavDropdown (unchanged) ──────────────────────────────────────────

function NavDropdown({
  item,
  locale,
  onLight,
  isOpen,
  onOpenChange,
}: {
  item: PublicNavItem;
  locale: Locale;
  onLight: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toggleFlyoutOnTap = () => {
    if (typeof window === "undefined") return;
    const coarseOrNarrow =
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(pointer: coarse)").matches;
    if (!coarseOrNarrow) return;
    onOpenChange(!isOpen);
  };

  const accentMobileOpen = isOpen ? " max-md:!text-site-brand-hover" : "";

  const linkTop = onLight
    ? `${navLinkBase} text-site-header-nav-light hover:text-site-brand-hover md:transition-colors md:group-hover:!text-site-brand-hover${accentMobileOpen}`
    : `${navLinkBase} text-site-header-hero md:group-hover:!text-site-brand${accentMobileOpen}`;

  const caretBase = onLight ? "text-site-brand-muted" : "text-white/80";
  const caret = `${caretBase} md:group-hover:!text-site-brand-hover${accentMobileOpen}`;

  const isUslugeMega = looksLikeUslugeParent(item);
  const sectioned = isUslugeMega || navItemHasNestedChildren(item);

  const flyoutPosition = sectioned
    ? isUslugeMega
      ? "absolute left-1/2 top-full z-[210] -mt-3 w-[min(96vw,920px)] -translate-x-1/2 pt-6"
      : "absolute left-1/2 top-full z-[210] -mt-3 w-[min(94vw,520px)] -translate-x-1/2 pt-6"
    : "absolute left-0 top-full z-[210] -mt-3 min-w-[280px] pt-6";

  const flyoutVisibility = [
    flyoutPosition,
    isOpen
      ? "max-md:visible max-md:opacity-100 max-md:pointer-events-auto"
      : "max-md:invisible max-md:opacity-0 max-md:pointer-events-none",
    "md:invisible md:opacity-0 md:pointer-events-none md:transition-[opacity,visibility] md:duration-200 md:ease-out",
    "md:group-hover:!visible md:group-hover:!opacity-100 md:group-hover:!pointer-events-auto",
    "md:group-focus-within:!visible md:group-focus-within:!opacity-100 md:group-focus-within:!pointer-events-auto",
    isOpen ? "md:!visible md:!opacity-100 md:!pointer-events-auto" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const dropdownShell = sectioned
    ? isUslugeMega
      ? [
          "relative overflow-hidden rounded-xl border border-site-brand/20",
          "bg-gradient-to-b from-site-surface-b via-site-surface-c to-site-surface-a",
          "shadow-site-lift",
        ].join(" ")
      : "relative overflow-hidden rounded-sm border border-zinc-200/85 bg-white shadow-[0_14px_44px_-16px_rgba(0,0,0,0.12)]"
    : "relative overflow-hidden rounded-md border border-zinc-200/90 bg-white shadow-[0_16px_44px_-12px_rgba(0,0,0,0.1)]";

  const subLink = [
    "block rounded-sm transition-colors duration-150 font-sans font-normal normal-case tracking-normal",
    "px-5 py-2.5 text-[0.9rem] leading-snug text-zinc-700",
    "hover:bg-zinc-50 hover:text-site-brand",
  ].join(" ");

  const subLinkMega = isUslugeMega
    ? [
        "block w-full border-b border-zinc-200/70 py-1.5 pr-1 text-left font-sans text-[0.875rem] font-normal normal-case leading-snug text-zinc-700",
        "transition-colors last:border-b-0 hover:bg-zinc-50 hover:text-site-brand",
      ].join(" ")
    : [
        "block w-full border-b border-zinc-100 py-2.5 pr-1 text-left font-sans text-[0.9rem] font-normal normal-case leading-snug text-zinc-700",
        "transition-colors last:border-b-0 hover:bg-zinc-50 hover:text-site-brand",
      ].join(" ");

  const megaCategoryHeading = isUslugeMega
    ? [
        "mb-0 block pb-1 font-sans text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-site-brand",
        "border-b border-site-brand/25 transition-colors hover:text-site-brand-hover",
      ].join(" ")
    : [
        "mb-0 block pb-3 font-sans text-[12px] font-semibold uppercase leading-tight tracking-[0.05em] text-site-brand",
        "border-b border-zinc-200 transition-colors hover:text-site-brand-hover",
      ].join(" ");

  if (item.children.length === 0) {
    return (
      <Link
        href={resolvePublicHref(locale, item.href)}
        className={`shrink-0 rounded-none px-2 py-2 md:px-2.5 md:py-2.5 ${linkTop}`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="group relative z-[1] shrink-0 hover:z-[100] focus-within:z-[100]">
      <button
        type="button"
        className={`flex items-center gap-1 rounded-none px-2 py-2 md:gap-1.5 md:px-2.5 md:py-2.5 ${linkTop}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={toggleFlyoutOnTap}
      >
        {item.label}
        <ChevronDown
          className={[
            "h-3 w-3 shrink-0 transition duration-200 md:h-3.5 md:w-3.5",
            caret,
            isOpen ? "max-md:rotate-180" : "",
            "md:group-hover:rotate-180",
          ].join(" ")}
          aria-hidden={true}
          strokeWidth={1.35}
        />
      </button>
      <div
        aria-hidden
        className="pointer-events-auto absolute inset-x-0 top-full z-[205] hidden h-10 md:block"
      />
      <div className={flyoutVisibility}>
        <div className={[sectioned ? "py-0" : "py-1.5", dropdownShell].join(" ")}>
          {sectioned ? (
            isUslugeMega ? (
              <div
                className="grid max-h-[min(78vh,720px)] min-h-0 grid-cols-3 items-stretch gap-0 overflow-y-auto overscroll-contain md:min-h-[min(52vh,520px)]"
                role="navigation"
                aria-label={item.label}
              >
                {bucketUslugePillarsForMegaMenu(item.children).map((bucket, colIdx) => (
                  <div
                    key={`mega-col-${colIdx}`}
                    className="flex min-h-0 min-w-0 flex-1 flex-col divide-y divide-site-brand/15 border-l border-site-brand/15 bg-gradient-to-b from-white/80 to-site-surface-a/50 first:border-l-0"
                  >
                    {bucket.map((col) => (
                      <section
                        key={col.id}
                        className="flex min-w-0 flex-none flex-col px-5 py-3 sm:px-6 sm:py-3.5"
                      >
                        <Link
                          href={resolvePublicHref(locale, col.href)}
                          className={megaCategoryHeading}
                          onClick={() => onOpenChange(false)}
                        >
                          {col.label}
                        </Link>
                        {col.children.length > 0 ? (
                          <ul className="m-0 mt-1.5 list-none space-y-0 p-0">
                            {col.children.map((sub) => (
                              <li key={sub.id} className="m-0 p-0">
                                <Link
                                  href={resolvePublicHref(locale, sub.href)}
                                  className={subLinkMega}
                                  onClick={() => onOpenChange(false)}
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </section>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={[
                  "max-h-[min(78vh,720px)] overflow-y-auto overscroll-contain",
                  "divide-y divide-zinc-100 px-0 pb-1 pt-0",
                ].join(" ")}
                role="navigation"
                aria-label={item.label}
              >
                {item.children.map((col) => (
                  <section key={col.id} className="min-w-0 px-5 py-4 sm:px-6 sm:py-5">
                    <Link
                      href={resolvePublicHref(locale, col.href)}
                      className={megaCategoryHeading}
                      onClick={() => onOpenChange(false)}
                    >
                      {col.label}
                    </Link>
                    {col.children.length > 0 ? (
                      <ul className="m-0 mt-3 list-none space-y-0 p-0">
                        {col.children.map((sub) => (
                          <li key={sub.id} className="m-0 p-0">
                            <Link
                              href={resolvePublicHref(locale, sub.href)}
                              className={subLinkMega}
                              onClick={() => onOpenChange(false)}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-0.5 px-3 py-2">
              {item.children.map((ch) => (
                <Link
                  key={ch.id}
                  href={resolvePublicHref(locale, ch.href)}
                  className={subLink}
                  onClick={() => onOpenChange(false)}
                >
                  {ch.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main SiteHeader ──────────────────────────────────────────────────────────

export function SiteHeader({ locale, s, nav, logoUrl }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const resolvedLogoSrc = logoUrl?.trim() || DEFAULT_HEADER_LOGO;
  const logoIsRemote = /^https?:\/\//i.test(resolvedLogoSrc);

  const isHome =
    pathname === `/${locale}` ||
    pathname === `/${locale}/` ||
    pathname?.split("/").filter(Boolean).length === 1;

  const onLight = !isHome || scrolled;

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) setScrolled(true);
  }, [isHome]);

  useEffect(() => {
    if (!openDropdownId) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (navRef.current?.contains(t)) return;
      setOpenDropdownId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdownId(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDropdownId]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const lightHeader = onLight || mobileNavOpen;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  /* Bez border-b — u Chromiumu često ostavi 1px svijetlu liniju (čak i border-transparent). */
  const headerShell = mobileNavOpen
    ? "border-0 bg-[#faf8f6] shadow-none"
    : lightHeader
      ? "border-0 bg-site-canvas shadow-[0_12px_32px_-16px_rgb(0_0_0/0.08)]"
      : "border-0 bg-transparent shadow-none";

  const ctaPrimary = lightHeader
    ? "site-btn-primary inline-flex items-center justify-center whitespace-nowrap px-5 py-2 font-serif text-[13px] font-medium tracking-[0.12em] md:px-6 md:py-2.5 md:text-[14px] md:tracking-[0.12em]"
    : "inline-flex items-center justify-center whitespace-nowrap rounded-[3px] border border-white/75 bg-white/10 px-5 py-2 font-serif text-[13px] font-medium uppercase tracking-[0.11em] text-white transition hover:border-site-brand hover:bg-site-brand/20 hover:text-white md:px-6 md:py-2.5 md:text-[14px] md:tracking-[0.11em]";

  const phoneRaw = (s["contact.phone1"] ?? "").trim();
  const phoneLabel = phoneRaw;
  const phoneHref = phoneRaw ? `tel:${phoneRaw.replace(/\s+/g, "")}` : "";

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[200] w-full pt-[env(safe-area-inset-top)] ${lightHeader ? "transition-colors duration-300" : ""} ${headerShell}`}
    >
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="relative z-[2] mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-10 md:py-3.5 lg:px-14">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="site-header-logo-link relative z-20 flex min-w-0 max-w-[min(100%,68vw)] items-center justify-self-start sm:max-w-[min(100%,72vw)] md:max-w-[min(100%,500px)]"
        >
          <Image
            src={resolvedLogoSrc}
            alt={s["org.brand"]}
            width={HEADER_LOGO_PIXEL_WIDTH}
            height={HEADER_LOGO_PIXEL_HEIGHT}
            priority
            unoptimized={logoIsRemote}
            draggable={false}
            tabIndex={-1}
            className="pointer-events-none block h-12 w-auto max-h-12 max-w-full select-none object-contain object-left sm:h-[3.35rem] sm:max-h-[3.35rem] md:h-[4.35rem] md:max-h-[4.55rem] lg:h-[4.75rem]"
            sizes="(max-width: 768px) 72vw, 540px"
          />
        </Link>

        {/* Desktop nav */}
        <nav
          ref={navRef}
          aria-label="Glavna navigacija"
          className="relative z-[35] hidden min-w-0 justify-self-center md:flex md:items-center md:gap-7 lg:gap-10 xl:gap-12"
        >
          {nav.map((item) => (
            <NavDropdown
              key={item.id}
              item={item}
              locale={locale}
              onLight={onLight}
              isOpen={openDropdownId === item.id}
              onOpenChange={(open) => setOpenDropdownId(open ? item.id : null)}
            />
          ))}
        </nav>

        {/* Right actions */}
        <div className="relative z-20 flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:justify-self-end">
          {/* Na mobilnom je switcher unutar menija (linija ~651) — ovdje samo desktop */}
          <span className="hidden md:contents">
            <SiteLanguageSwitcher locale={locale} onLight={lightHeader} />
          </span>
          {/* CTA u headeru samo na tablet/desktop — na telefonu je u mobilnom meniju (veći, touch-friendly) */}
          <Link
            href={resolvePublicHref(locale, s["header.cta_book_href"] ?? "")}
            className={`${ctaPrimary} hidden md:inline-flex`}
          >
            {s["header.cta_book"]}
          </Link>

          {/* Hamburger — premium pill style on mobile */}
          <button
            type="button"
            className={[
              "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 sm:h-10 sm:w-10 sm:rounded-xl md:hidden",
              mobileNavOpen
                ? "bg-site-brand text-white shadow-[0_4px_14px_rgb(232_104_42/0.4)]"
                : lightHeader
                  ? "border border-zinc-200/80 bg-white/60 text-zinc-700 shadow-sm hover:border-site-brand/30 hover:bg-site-brand/[0.06] hover:text-site-brand"
                  : "border-0 bg-white/12 text-white backdrop-blur-sm hover:bg-white/20",
            ].join(" ")}
            aria-expanded={mobileNavOpen}
            aria-controls="site-mobile-nav"
            aria-label={mobileNavOpen ? "Zatvori navigaciju" : "Otvori navigaciju"}
            onClick={() => {
              setOpenDropdownId(null);
              setMobileNavOpen((o) => !o);
            }}
          >
            <span
              className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${mobileNavOpen ? "opacity-100" : "opacity-0"}`}
              aria-hidden
            />
            {mobileNavOpen ? (
              <X className="relative h-5 w-5" strokeWidth={2} aria-hidden />
            ) : (
              <Menu className="relative h-5 w-5" strokeWidth={1.85} aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* ── Premium Mobile Nav Panel ────────────────────────────── */}
      {/*
       * Panel je uvijek u DOM-u ali transition-[max-height,opacity] animira otvaranje.
       * overflow-hidden na vanjskom, overflow-y-auto na unutarnjem spriječava dvojni scroll.
       */}
      <div
        id="site-mobile-nav"
        aria-hidden={!mobileNavOpen}
        className={[
          "md:hidden",
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          mobileNavOpen
            ? "max-h-[calc(100dvh-4rem)] opacity-100"
            : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div
          className={[
            "flex max-h-[calc(100dvh-4rem)] flex-col overflow-y-auto overscroll-contain",
            // Premium background
            "bg-[#faf8f6]/[0.98] backdrop-blur-2xl",
            // Shadow beneath
            "border-0 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.22)]",
          ].join(" ")}
        >
          {/* ── Panel header: language + tagline ── */}
          <div className="flex shrink-0 items-center justify-between border-0 px-5 py-3">
            <span className="font-header-nav text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {s["org.brand"] || ""}
            </span>
            <SiteLanguageSwitcher locale={locale} onLight />
          </div>

          {/* ── Nav items (scrollable) ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain pb-2 pt-1">
            <MobileNavSections
              nav={nav}
              locale={locale}
              s={s}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>

          {/* ── Premium CTA zone ── */}
          <div
            className={[
              "shrink-0 border-t border-zinc-100/80 px-5 py-4",
              "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              // Subtle gradient tint
              "bg-gradient-to-b from-transparent to-site-brand/[0.03]",
            ].join(" ")}
          >
            {/* Phone row — shown if configured */}
            {phoneHref && phoneLabel ? (
              <a
                href={phoneHref}
                className="mb-3 flex items-center gap-2.5 text-zinc-500 transition-colors hover:text-site-brand"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-site-brand/20 bg-site-brand/[0.07] text-site-brand">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="font-sans text-[13px] font-medium tracking-wide">
                  {phoneLabel}
                </span>
              </a>
            ) : null}

            {/* CTA button — full width, premium */}
            <Link
              href={resolvePublicHref(locale, s["header.cta_book_href"] ?? "")}
              onClick={() => setMobileNavOpen(false)}
              className={[
                "site-btn-primary",
                "flex w-full items-center justify-center",
                "py-[0.875rem] font-serif text-[14px] font-medium tracking-[0.14em]",
                "rounded-xl",
              ].join(" ")}
            >
              {s["header.cta_book"]}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
