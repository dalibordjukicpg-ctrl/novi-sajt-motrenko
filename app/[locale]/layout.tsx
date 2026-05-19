import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ScrollToTopButton } from "@/components/site/scroll-to-top-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { MaintenanceScreen } from "@/components/site/maintenance-screen";
import { PublicAnalyticsCollector } from "@/components/site/public-analytics-collector";
import {
  FALLBACK_HEADER_NAV,
  mergeNavWithFallbackSubmenus,
  resolveHeaderNav,
} from "@/lib/fallback-header-nav";
import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import { getSiteLayoutData, mergeSiteStrings } from "@/lib/queries/site";
import type { PublicNavItem } from "@/lib/queries/site";
import { getRequestClientIp } from "@/lib/request-client-ip";
import {
  getMaintenancePublicStateForRequest,
  getSiteBranding,
} from "@/lib/queries/site-globals";
import { SITE_STRING_DEFAULTS, type SiteStringKey } from "@/lib/site-fields";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  try {
    const clientIp = await getRequestClientIp();
    const m = await getMaintenancePublicStateForRequest(clientIp);
    if (m.active) {
      return {
        title: m.title,
        description: m.message.slice(0, 160),
        robots: { index: false, follow: false },
      };
    }
  } catch {
    /* ignore */
  }
  const defaults = SITE_STRING_DEFAULTS[raw];
  let icons: Metadata["icons"] | undefined;
  try {
    const b = await getSiteBranding();
    if (b.faviconUrl) {
      icons = { icon: b.faviconUrl };
    }
  } catch {
    /* ignore */
  }
  return {
    title: defaults["org.brand"],
    description: defaults["hero.subtitle"].slice(0, 160),
    icons,
  };
}

function LocaleChrome({
  locale,
  s,
  nav,
  footerContactHref,
  logoUrl,
  children,
}: {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  nav: PublicNavItem[];
  footerContactHref: string | null;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-[1] flex min-h-dvh flex-col bg-transparent text-site-ink">
      <SiteHeader locale={locale} s={s} nav={nav} logoUrl={logoUrl} />
      <HeaderSpacer />
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter
        locale={locale}
        s={s}
        footerContactHref={footerContactHref}
        logoUrl={logoUrl}
      />
      <Suspense fallback={null}>
        <PublicAnalyticsCollector />
      </Suspense>
      <ScrollToTopButton />
    </div>
  );
}

function HeaderSpacer() {
  return (
    <div
      className="h-[calc(4.25rem+env(safe-area-inset-top))] shrink-0 md:h-[calc(4.75rem+env(safe-area-inset-top))]"
      aria-hidden={true}
    />
  );
}

async function LocaleLayoutInner({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  let clientIp = "unknown";
  try {
    clientIp = await getRequestClientIp();
  } catch (e) {
    console.error("[LocaleLayout getRequestClientIp]", e);
  }

  const maintenance = await getMaintenancePublicStateForRequest(clientIp);
  if (maintenance.active) {
    return (
      <MaintenanceScreen
        title={maintenance.title}
        message={maintenance.message}
        logoUrl={maintenance.logoUrl}
      />
    );
  }

  let s = mergeSiteStrings(locale, {});
  let nav: PublicNavItem[] = [];
  let footerContactHref: string | null = null;
  let logoUrl: string | null = null;
  try {
    const data = await getSiteLayoutData(locale);
    s = data.s;
    nav = data.nav;
    footerContactHref = data.footerContactHref;
    logoUrl = data.logoUrl;
  } catch (e) {
    console.error("[LocaleLayout getSiteLayoutData]", e);
    s = mergeSiteStrings(locale, SITE_STRING_DEFAULTS[locale]);
  }

  let navResolved = mergeNavWithFallbackSubmenus(
    nav.length > 0 ? nav : FALLBACK_HEADER_NAV,
  );
  try {
    navResolved = await resolveHeaderNav(
      nav.length > 0 ? nav : FALLBACK_HEADER_NAV,
      locale,
    );
  } catch (e) {
    console.error("[LocaleLayout resolveHeaderNav]", e);
  }

  return (
    <LocaleChrome
      locale={locale}
      s={s}
      nav={navResolved}
      footerContactHref={footerContactHref}
      logoUrl={logoUrl}
    >
      {children}
    </LocaleChrome>
  );
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();

  try {
    return await LocaleLayoutInner({ children, locale: raw });
  } catch (e) {
    console.error("[LocaleLayout fatal]", e);
    const s = mergeSiteStrings(raw, SITE_STRING_DEFAULTS[raw]);
    const nav = mergeNavWithFallbackSubmenus(FALLBACK_HEADER_NAV);
    return (
      <LocaleChrome
        locale={raw}
        s={s}
        nav={nav}
        footerContactHref={null}
        logoUrl={null}
      >
        {children}
      </LocaleChrome>
    );
  }
}
