"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, Phone, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal, flushSync } from "react-dom";

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

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function navigateToHash(pathname: string, hash: string) {
  let selector = hash;
  let el = document.querySelector(selector);

  if (!el && /^#usluge([_-]|$)/i.test(hash)) {
    selector = "#usluge";
    el = document.querySelector(selector);
  }

  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", `${pathname}${selector}`);
    return;
  }

  window.location.assign(`${pathname}${hash}`);
}

function HeaderMenuLink({
  href,
  onClose,
  className,
  children,
}: {
  href: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const closeNow = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    flushSync(() => {
      onClose();
    });
    document.body.style.overflow = "";

    if (isExternalHref(href)) return;

    try {
      const target = new URL(href, window.location.origin);
      const here = new URL(window.location.href);
      if (target.pathname === here.pathname && target.hash) {
        e.preventDefault();
        navigateToHash(target.pathname, target.hash);
      }
    } catch {
      /* Link/default browser navigation */
    }
  };

  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} onClick={closeNow}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} scroll onClick={closeNow}>
      {children}
    </Link>
  );
}

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
              <HeaderMenuLink
                key={sub.id}
                href={resolvePublicHref(locale, sub.href)}
                onClose={onNavigate}
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
              </HeaderMenuLink>
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
            <HeaderMenuLink
              key={item.id}
              href={resolvePublicHref(locale, item.href)}
              onClose={onNavigate}
              className="flex items-center border-b border-zinc-100/80 px-6 py-[1.05rem] font-header-nav text-[13px] font-semibold uppercase tracking-[0.13em] text-zinc-800 transition-colors hover:bg-zinc-50/60 hover:text-site-brand last:border-b-0 active:bg-zinc-50"
            >
              {item.label}
            </HeaderMenuLink>
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
      <HeaderMenuLink
        href={resolvePublicHref(locale, searchHref)}
        onClose={onNavigate}
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
      </HeaderMenuLink>
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
  isHovered,
  dismissedDropdownId,
  onHover,
  onLeave,
  onDismiss,
  onNavigate,
}: {
  item: PublicNavItem;
  locale: Locale;
  onLight: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isHovered: boolean;
  dismissedDropdownId: string | null;
  onHover: () => void;
  onLeave: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUslugeMega = looksLikeUslugeParent(item);

  const handleEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    onHover();
  };

  const handleLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    const delay = isUslugeMega ? 350 : 150;
    leaveTimerRef.current = setTimeout(() => {
      leaveTimerRef.current = null;
      onLeave();
    }, delay);
  };

  useEffect(
    () => () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    },
    [],
  );

  const closeFlyout = () => {
    onDismiss();
    onOpenChange(false);
    onNavigate();
  };

  const isDismissed = dismissedDropdownId === item.id;
  const flyoutOpen = !isDismissed && (isHovered || isOpen);

  const accentMobileOpen = isOpen ? " max-md:!text-site-brand-hover" : "";

  const linkTop = onLight
    ? `${navLinkBase} text-site-header-nav-light hover:text-site-brand-hover md:transition-colors${flyoutOpen ? " !text-site-brand-hover" : ""}${accentMobileOpen}`
    : `${navLinkBase} text-site-header-hero${flyoutOpen ? " !text-site-brand" : ""}${accentMobileOpen}`;

  const caretBase = onLight ? "text-site-brand-muted" : "text-white/80";
  const caret = `${caretBase}${flyoutOpen ? " !text-site-brand-hover" : ""}${accentMobileOpen}`;

  const sectioned = isUslugeMega || navItemHasNestedChildren(item);

  const flyoutPosition = sectioned
    ? isUslugeMega
      ? [
          /* Mobil: ispod stavke; desktop: centar ekrana (ne samo iznad „Usluge”) */
          "absolute left-1/2 top-full z-[210] -mt-3 w-[min(96vw,920px)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 pt-6",
          "md:fixed md:left-1/2 md:right-auto md:top-[calc(env(safe-area-inset-top)+6.5rem)] md:mt-0 md:w-[min(96vw,920px)] md:max-w-[920px] md:-translate-x-1/2",
        ].join(" ")
      : "absolute left-1/2 top-full z-[210] -mt-3 w-[min(94vw,520px)] -translate-x-1/2 pt-6"
    : "absolute left-0 top-full z-[210] -mt-3 min-w-[280px] pt-6";

  const flyoutVisibility = [
    flyoutPosition,
    flyoutOpen
      ? "visible opacity-100 pointer-events-auto"
      : "invisible opacity-0 pointer-events-none",
    "transition-[opacity,visibility] duration-200 ease-out",
  ].join(" ");

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
      <HeaderMenuLink
        href={resolvePublicHref(locale, item.href)}
        onClose={onNavigate}
        className={`shrink-0 rounded-none px-2 py-2 md:px-2.5 md:py-2.5 ${linkTop}`}
      >
        {item.label}
      </HeaderMenuLink>
    );
  }

  return (
    <div
      className="relative z-[1] shrink-0"
      style={{ zIndex: flyoutOpen ? 100 : 1 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className={`flex items-center gap-1 rounded-none px-2 py-2 md:gap-1.5 md:px-2.5 md:py-2.5 ${linkTop}`}
        aria-expanded={flyoutOpen}
        aria-haspopup="true"
        onClick={() => onOpenChange(!isOpen)}
      >
        {item.label}
        <ChevronDown
          className={[
            "h-3 w-3 shrink-0 transition duration-200 md:h-3.5 md:w-3.5",
            caret,
            flyoutOpen ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden={true}
          strokeWidth={1.35}
        />
      </button>
      <div
        aria-hidden
        className="pointer-events-auto absolute inset-x-0 top-full z-[205] hidden h-10 md:block"
      />
      <div
        className={flyoutVisibility}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
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
                        <HeaderMenuLink
                          href={resolvePublicHref(locale, col.href)}
                          onClose={closeFlyout}
                          className={megaCategoryHeading}
                        >
                          {col.label}
                        </HeaderMenuLink>
                        {col.children.length > 0 ? (
                          <ul className="m-0 mt-1.5 list-none space-y-0 p-0">
                            {col.children.map((sub) => (
                              <li key={sub.id} className="m-0 p-0">
                                <HeaderMenuLink
                                  href={resolvePublicHref(locale, sub.href)}
                                  onClose={closeFlyout}
                                  className={subLinkMega}
                                >
                                  {sub.label}
                                </HeaderMenuLink>
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
                    <HeaderMenuLink
                      href={resolvePublicHref(locale, col.href)}
                      onClose={closeFlyout}
                      className={megaCategoryHeading}
                    >
                      {col.label}
                    </HeaderMenuLink>
                    {col.children.length > 0 ? (
                      <ul className="m-0 mt-3 list-none space-y-0 p-0">
                        {col.children.map((sub) => (
                          <li key={sub.id} className="m-0 p-0">
                            <HeaderMenuLink
                              href={resolvePublicHref(locale, sub.href)}
                              onClose={closeFlyout}
                              className={subLinkMega}
                            >
                              {sub.label}
                            </HeaderMenuLink>
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
                <HeaderMenuLink
                  key={ch.id}
                  href={resolvePublicHref(locale, ch.href)}
                  onClose={closeFlyout}
                  className={subLink}
                >
                  {ch.label}
                </HeaderMenuLink>
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
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [menuTop, setMenuTop] = useState(0);

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
    const onDocMouseDown = (e: globalThis.MouseEvent) => {
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
  const [hoveredDropdownId, setHoveredDropdownId] = useState<string | null>(null);
  const [dismissedDropdownId, setDismissedDropdownId] = useState<string | null>(null);
  const prevPathnameRef = useRef(pathname);
  const lightHeader = onLight || mobileNavOpen;

  const closeAllNav = useCallback(() => {
    setMobileNavOpen(false);
    setOpenDropdownId(null);
    setHoveredDropdownId(null);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!mobileNavOpen || !headerRef.current) return;
    const syncTop = () => {
      setMenuTop(headerRef.current!.getBoundingClientRect().bottom);
    };
    syncTop();
    window.addEventListener("resize", syncTop);
    window.addEventListener("scroll", syncTop, { passive: true });
    return () => {
      window.removeEventListener("resize", syncTop);
      window.removeEventListener("scroll", syncTop);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (prev === pathname) return;
    closeAllNav();
    setDismissedDropdownId(null);
  }, [pathname, closeAllNav]);

  useEffect(() => {
    const onHash = () => {
      closeAllNav();
      setDismissedDropdownId(null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [closeAllNav]);

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
      : "border-0 bg-transparent shadow-none max-md:bg-white/[0.05] max-md:backdrop-blur-md";

  const ctaCompact =
    "inline-flex items-center justify-center whitespace-nowrap px-3.5 py-1.5 font-serif text-[11px] font-medium uppercase tracking-[0.12em] md:px-4 md:py-1.5 md:text-[12px] md:tracking-[0.13em]";

  const ctaPrimary = lightHeader
    ? `site-btn-primary site-header-cta ${ctaCompact}`
    : `${ctaCompact} rounded-[3px] border border-white/75 bg-white/10 text-white transition hover:border-site-brand hover:bg-site-brand/20 hover:text-white`;

  const phoneRaw = (s["contact.phone1"] ?? "").trim();
  const phoneLabel = phoneRaw;
  const phoneHref = phoneRaw ? `tel:${phoneRaw.replace(/\s+/g, "")}` : "";

  return (
    <header
      ref={headerRef}
      className={`fixed left-0 right-0 top-0 z-[200] w-full pt-[env(safe-area-inset-top)] ${lightHeader ? "transition-colors duration-300" : ""} ${headerShell}`}
    >
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="relative z-[2] mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-10 md:py-3.5 lg:px-14">
        {/* Logo */}
        <HeaderMenuLink
          href={`/${locale}`}
          onClose={closeAllNav}
          className="site-header-logo-link relative z-20 flex min-w-0 max-w-[min(100%,76vw)] items-center justify-self-start sm:max-w-[min(100%,80vw)] md:max-w-[min(100%,580px)]"
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
            className="pointer-events-none block h-[4.1rem] w-auto max-h-[4.1rem] max-w-full select-none object-contain object-left sm:h-[4.35rem] sm:max-h-[4.35rem] md:h-[5.15rem] md:max-h-[5.15rem] lg:h-[5.5rem] lg:max-h-[5.5rem]"
            sizes="(max-width: 768px) 80vw, 580px"
          />
        </HeaderMenuLink>

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
              isHovered={hoveredDropdownId === item.id}
              dismissedDropdownId={dismissedDropdownId}
              onHover={() => setHoveredDropdownId(item.id)}
              onLeave={() => {
                setHoveredDropdownId((cur) => (cur === item.id ? null : cur));
                setOpenDropdownId((cur) => (cur === item.id ? null : cur));
                setDismissedDropdownId((cur) => (cur === item.id ? null : cur));
              }}
              onDismiss={() => setDismissedDropdownId(item.id)}
              onNavigate={closeAllNav}
            />
          ))}
        </nav>

        {/* Right actions */}
        <div className="relative z-20 flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:justify-self-end">
          <SiteLanguageSwitcher locale={locale} onLight={lightHeader} compact />
          {/* CTA u headeru samo na tablet/desktop — na telefonu je u mobilnom meniju (veći, touch-friendly) */}
          <HeaderMenuLink
            href={resolvePublicHref(locale, s["header.cta_book_href"] ?? "")}
            onClose={closeAllNav}
            className={`${ctaPrimary} hidden md:inline-flex`}
          >
            {s["header.cta_book"]}
          </HeaderMenuLink>

          {/* Hamburger — premium pill style on mobile */}
          <button
            type="button"
            className={[
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 md:hidden",
              mobileNavOpen
                ? "bg-site-brand text-white shadow-[0_4px_20px_rgb(232_104_42/0.5)] ring-1 ring-site-brand/40"
                : lightHeader
                  ? "border border-zinc-200 bg-white text-zinc-700 shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:border-site-brand/40 hover:bg-site-brand/[0.06] hover:text-site-brand active:scale-95"
                  : "border border-white/30 bg-white/[0.14] text-white backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.18)] hover:border-white/50 hover:bg-white/[0.22] active:scale-95",
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

      {portalReady && mobileNavOpen
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Zatvori navigaciju"
                className="fixed inset-x-0 bottom-0 z-[500] bg-black/30 md:hidden"
                style={{ top: menuTop }}
                onClick={closeAllNav}
              />
              <div
                id="site-mobile-nav"
                className="fixed inset-x-0 bottom-0 z-[501] flex flex-col overflow-hidden bg-[#faf8f6] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.22)] md:hidden"
                style={{ top: menuTop }}
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                  <div className="flex shrink-0 items-center border-0 px-5 py-3">
                    <span className="font-header-nav text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {s["org.brand"] || ""}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain pb-2 pt-1">
                    <MobileNavSections
                      nav={nav}
                      locale={locale}
                      s={s}
                      onNavigate={closeAllNav}
                    />
                  </div>

                  <div
                    className={[
                      "shrink-0 border-t border-zinc-100/80 px-5 py-4",
                      "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
                      "bg-gradient-to-b from-transparent to-site-brand/[0.03]",
                    ].join(" ")}
                  >
                    {phoneHref && phoneLabel ? (
                      <a
                        href={phoneHref}
                        onClick={() => {
                          flushSync(() => closeAllNav());
                        }}
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

                    <HeaderMenuLink
                      href={resolvePublicHref(locale, s["header.cta_book_href"] ?? "")}
                      onClose={closeAllNav}
                      className={[
                        "site-btn-primary",
                        "flex w-full items-center justify-center",
                        "py-[0.875rem] font-serif text-[14px] font-medium tracking-[0.14em]",
                        "rounded-xl",
                      ].join(" ")}
                    >
                      {s["header.cta_book"]}
                    </HeaderMenuLink>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </header>
  );
}
