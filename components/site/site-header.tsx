"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, Search, X } from "lucide-react";
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

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  nav: PublicNavItem[];
  logoUrl?: string | null;
};

/** Serifa, miran tracking — bez agresivnog caps + geometrijskog sans-a. */
const navLinkBase =
  "whitespace-nowrap font-serif text-[12px] font-medium uppercase tracking-[0.1em] antialiased transition md:text-[13px] md:tracking-[0.11em] lg:text-[14px] lg:tracking-[0.11em]";

function navItemHasNestedChildren(item: PublicNavItem): boolean {
  return item.children.some((c) => c.children.length > 0);
}

/** Mobilni red: stubovi „Usluge“ u kanonskom redoslijedu (isti kao u mega meniju). */
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

/** Tri kolone mega menija: [Infertilitet, Trudnoća] | [IUI/IVF] | [Ginekologija, Prezervacija]. */
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
    if (k) {
      byKey.set(k, p);
    } else {
      unmatched.push(p);
    }
  }
  const cols = USLUGE_MEGA_COLUMN_KEYS.map((keys) =>
    keys.map((k) => byKey.get(k)).filter((node): node is PublicNavItem => node != null),
  );
  for (const p of unmatched) {
    cols[2]!.push(p);
  }
  return cols;
}

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
    <>
      {rows.map((item) =>
        item.children.length === 0 ? (
          <Link
            key={item.id}
            href={resolvePublicHref(locale, item.href)}
            className="flex items-center border-b border-zinc-200/90 px-4 py-4 font-serif text-[14px] font-medium uppercase tracking-[0.09em] text-site-header-nav-light hover:text-site-brand active:bg-zinc-50/80"
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        ) : (
          <details key={item.id} className="group border-b border-zinc-200/90">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
              <span className="text-left font-serif text-[14px] font-medium uppercase tracking-[0.09em] text-site-header-nav-light">
                {item.label}
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300/90 text-zinc-500 transition-transform duration-200 group-open:-rotate-180">
                <ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
            </summary>
            <div className="border-t border-zinc-100 bg-zinc-50/70">
              {item.children.map((sub) => (
                <Link
                  key={sub.id}
                  href={resolvePublicHref(locale, sub.href)}
                  className="block border-b border-zinc-100/90 px-4 py-3.5 pl-6 font-sans text-[15px] font-normal leading-snug text-zinc-700 last:border-b-0 hover:bg-white hover:text-site-brand"
                  onClick={onNavigate}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          </details>
        ),
      )}
      <Link
        href={resolvePublicHref(locale, searchHref)}
        className="group flex items-center gap-3 border-b border-zinc-200/90 px-4 py-4 text-site-header-caret hover:bg-zinc-50 hover:text-site-brand"
        onClick={onNavigate}
      >
        <Search className="h-5 w-5 shrink-0 text-site-muted" strokeWidth={1.75} aria-hidden />
        <span className="font-serif text-[13px] font-medium uppercase tracking-[0.1em] text-site-muted group-hover:text-site-brand">
          {searchLabel}
        </span>
      </Link>
    </>
  );
}

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

  const accentMobileOpen = isOpen ? " max-md:!text-site-brand" : "";

  const linkTop = onLight
    ? `${navLinkBase} text-site-header-nav-light hover:text-site-brand md:transition-colors md:group-hover:!text-site-brand${accentMobileOpen}`
    : `${navLinkBase} text-site-header-hero md:group-hover:!text-site-brand${accentMobileOpen}`;

  const caretBase = onLight ? "text-site-muted" : "text-white/80";
  const caret = `${caretBase} md:group-hover:!text-site-brand${accentMobileOpen}`;

  const isUslugeMega = looksLikeUslugeParent(item);
  /** Mega: „Usluge“ (sve kategorije odjednom) ili dublje stablo van Usluga. */
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
    isOpen
      ? "md:!visible md:!opacity-100 md:!pointer-events-auto"
      : "",
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

  /** Vertikalna lista u mega meniju — kompaktno, blaga linija između stavki. */
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
      {/* Uski hover-most (širina stavke); široki blok je presijecao sadržaj i hvatao klikove. */}
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
                  <section
                    key={col.id}
                    className="min-w-0 px-5 py-4 sm:px-6 sm:py-5"
                  >
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

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const headerShell = lightHeader
    ? "border-b border-black/[0.03] bg-white/92 shadow-[0_24px_48px_-20px_rgb(0_0_0/0.07),0_8px_32px_-28px_rgb(0_0_0/0.04)] backdrop-blur-lg supports-[backdrop-filter]:bg-white/88"
    : "border-b border-transparent bg-transparent shadow-none backdrop-blur-none";

  const ctaPrimary = lightHeader
    ? "site-btn-primary inline-flex items-center justify-center whitespace-nowrap px-5 py-2 font-serif text-[13px] font-medium tracking-[0.12em] md:px-6 md:py-2.5 md:text-[14px] md:tracking-[0.12em]"
    : "inline-flex items-center justify-center whitespace-nowrap rounded-[3px] border border-white/75 bg-white/10 px-5 py-2 font-serif text-[13px] font-medium uppercase tracking-[0.11em] text-white transition hover:border-site-brand hover:bg-site-brand/20 hover:text-white md:px-6 md:py-2.5 md:text-[14px] md:tracking-[0.11em]";

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[200] w-full transition-colors duration-300 ${headerShell}`}
    >
      <div className="relative z-[2] mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-10 md:py-3.5 lg:px-14">
        <Link
          href={`/${locale}`}
          className="group relative z-20 flex max-w-[min(100%,72vw)] shrink-0 items-center justify-self-start md:max-w-[min(100%,460px)]"
        >
          {/* Na hero-u lagana podloga + isolate — izbjegava Chromium „dupli strip“ iznad videa */}
          <span
            className={
              lightHeader
                ? "relative isolate inline-flex max-w-full"
                : "relative isolate inline-flex max-w-full rounded-lg bg-black/45 px-2 py-1 ring-1 ring-white/15 backdrop-blur-sm"
            }
          >
            <Image
              src={resolvedLogoSrc}
              alt={s["org.brand"]}
              width={HEADER_LOGO_PIXEL_WIDTH}
              height={HEADER_LOGO_PIXEL_HEIGHT}
              priority
              unoptimized={logoIsRemote}
              className="block h-8 w-auto max-h-[2.35rem] max-w-full object-contain object-left sm:h-10 sm:max-h-[2.85rem] md:h-[3.5rem] md:max-h-[3.65rem] lg:h-[3.85rem]"
              sizes="(max-width: 768px) 72vw, 420px"
            />
          </span>
        </Link>

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

        <div className="relative z-20 flex min-w-0 shrink-0 items-center justify-self-end gap-1 sm:gap-2 md:justify-self-end">
          <Link
            href={resolvePublicHref(locale, s["header.cta_book_href"])}
            className={`${ctaPrimary} inline-flex max-md:min-w-0 max-md:max-w-[38vw] max-md:truncate max-md:px-3 max-md:py-1.5 max-md:text-[10px] max-md:tracking-[0.07em]`}
          >
            {s["header.cta_book"]}
          </Link>
          <button
            type="button"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition md:hidden ${
              lightHeader
                ? "text-site-header-nav-light hover:bg-zinc-100 hover:text-site-brand"
                : "text-white hover:text-site-brand"
            }`}
            aria-expanded={mobileNavOpen}
            aria-controls="site-mobile-nav"
            aria-label={mobileNavOpen ? "Zatvori navigaciju" : "Otvori navigaciju"}
            onClick={() => {
              setOpenDropdownId(null);
              setMobileNavOpen((o) => !o);
            }}
          >
            {mobileNavOpen ? (
              <X className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div
        id="site-mobile-nav"
        className={
          mobileNavOpen
            ? "max-h-[min(85dvh,680px)] overflow-y-auto overscroll-contain border-t border-zinc-200/90 bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] md:hidden"
            : "hidden"
        }
      >
        <MobileNavSections
          nav={nav}
          locale={locale}
          s={s}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>
    </header>
  );
}
