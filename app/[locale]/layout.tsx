import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteLayoutData } from "@/lib/queries/site";
import { getSiteBranding } from "@/lib/queries/site-globals";
import { isLocale } from "@/lib/i18n";
import { SITE_STRING_DEFAULTS } from "@/lib/site-fields";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
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

  let s = SITE_STRING_DEFAULTS[raw];
  let nav: Awaited<ReturnType<typeof getSiteLayoutData>>["nav"] = [];
  let logoUrl: string | null = null;
  try {
    const data = await getSiteLayoutData(raw);
    s = data.s;
    nav = data.nav;
    logoUrl = data.logoUrl;
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-transparent text-slate-900">
      <SiteHeader locale={raw} s={s} nav={nav} logoUrl={logoUrl} />
      <div className="flex-1">{children}</div>
      <SiteFooter locale={raw} s={s} nav={nav} />
    </div>
  );
}
