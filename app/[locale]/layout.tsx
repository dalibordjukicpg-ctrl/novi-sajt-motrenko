import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ScrollToTopButton } from "@/components/site/scroll-to-top-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { MaintenanceScreen } from "@/components/site/maintenance-screen";
import { PublicAnalyticsCollector } from "@/components/site/public-analytics-collector";
import { FALLBACK_HEADER_NAV, resolveHeaderNav } from "@/lib/fallback-header-nav";
import type { FooterColumnData } from "@/lib/footer-structured-nav";
import { getSiteLayoutData, mergeSiteStrings } from "@/lib/queries/site";
import { getRequestClientIp } from "@/lib/request-client-ip";
import {
  getMaintenancePublicStateForRequest,
  getSiteBranding,
} from "@/lib/queries/site-globals";
import { isLocale } from "@/lib/i18n";
import { withCanonical } from "@/lib/page-metadata";
import { getShareCopy } from "@/lib/social-share-metadata";
import { SITE_STRING_DEFAULTS } from "@/lib/site-fields";

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
  const share = getShareCopy(raw);
  let icons: Metadata["icons"] | undefined;
  try {
    const b = await getSiteBranding();
    if (b.faviconUrl) {
      icons = { icon: b.faviconUrl };
    }
  } catch {
    /* ignore */
  }
  return withCanonical(`/${raw}`, {
    title: share.ogTitle,
    description: share.ogDescription,
    icons,
  });
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

  let s = mergeSiteStrings(raw, {});
  let nav: Awaited<ReturnType<typeof getSiteLayoutData>>["nav"] = [];
  let footerContactHref: Awaited<
    ReturnType<typeof getSiteLayoutData>
  >["footerContactHref"] = null;
  let footerStructured: FooterColumnData[] = [];
  let logoUrl: string | null = null;
  try {
    const data = await getSiteLayoutData(raw);
    s = data.s;
    nav = data.nav;
    footerContactHref = data.footerContactHref;
    footerStructured = data.footerStructured;
    logoUrl = data.logoUrl;
  } catch (e) {
    console.error("[LocaleLayout getSiteLayoutData]", e);
    s = mergeSiteStrings(raw, SITE_STRING_DEFAULTS[raw]);
  }

  const navResolved = await resolveHeaderNav(
    nav.length > 0 ? nav : FALLBACK_HEADER_NAV,
    raw,
    s,
  );

  return (
    <div className="relative z-[1] flex min-h-dvh flex-col bg-transparent text-site-ink">
      <SiteHeader locale={raw} s={s} nav={navResolved} logoUrl={logoUrl} />
      {/* Fiksni header + iOS notch — rezervišemo visinu kao na hero -mt. */}
      <div
        className="h-[calc(4.25rem+env(safe-area-inset-top))] shrink-0 md:h-[calc(4.75rem+env(safe-area-inset-top))]"
        aria-hidden={true}
      />
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter
        locale={raw}
        s={s}
        footerContactHref={footerContactHref}
        footerStructured={footerStructured}
        logoUrl={logoUrl}
      />
      <Suspense fallback={null}>
        <PublicAnalyticsCollector />
      </Suspense>
      <ScrollToTopButton />
    </div>
  );
}
