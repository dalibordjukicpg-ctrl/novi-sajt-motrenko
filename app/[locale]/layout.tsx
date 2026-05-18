import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ScrollToTopButton } from "@/components/site/scroll-to-top-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { MaintenanceScreen } from "@/components/site/maintenance-screen";
import { PublicAnalyticsCollector } from "@/components/site/public-analytics-collector";
import { FALLBACK_HEADER_NAV, resolveHeaderNav } from "@/lib/fallback-header-nav";
import { getSiteLayoutData } from "@/lib/queries/site";
import { getRequestClientIp } from "@/lib/request-client-ip";
import {
  getMaintenancePublicStateForRequest,
  getSiteBranding,
} from "@/lib/queries/site-globals";
import { isLocale } from "@/lib/i18n";
import { SITE_STRING_DEFAULTS } from "@/lib/site-fields";

/** Uključi kada CMS logo ponovo treba da zamijeni /logo-hrc-budva.png. */
const USE_CMS_BRAND_LOGO = false;

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

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();

  const clientIp = await getRequestClientIp();
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

  let s = SITE_STRING_DEFAULTS[raw];
  let nav: Awaited<ReturnType<typeof getSiteLayoutData>>["nav"] = [];
  let footerContactHref: Awaited<
    ReturnType<typeof getSiteLayoutData>
  >["footerContactHref"] = null;
  let logoUrl: string | null = null;
  try {
    const data = await getSiteLayoutData(raw);
    s = data.s;
    nav = data.nav;
    footerContactHref = data.footerContactHref;
    logoUrl = USE_CMS_BRAND_LOGO ? data.logoUrl : null;
  } catch (e) {
    console.error(e);
  }

  const navResolved = resolveHeaderNav(nav.length > 0 ? nav : FALLBACK_HEADER_NAV);

  return (
    <div className="relative z-[1] flex min-h-dvh flex-col bg-transparent text-site-ink">
      <SiteHeader locale={raw} s={s} nav={navResolved} logoUrl={logoUrl} />
      {/* Fiksni header nije u toku layout-a; rezervišemo visinu kao na hero -mt. */}
      <div className="h-16 shrink-0 md:h-[4.5rem]" aria-hidden={true} />
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter
        locale={raw}
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
