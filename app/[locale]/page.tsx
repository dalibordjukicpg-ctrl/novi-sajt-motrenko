import { notFound } from "next/navigation";

import { HomePageView } from "@/components/site/home-page";
import { getDbConnectionUserMessage, isDbConnectionError } from "@/lib/db-errors";
import { FALLBACK_HEADER_NAV, resolveHeaderNav } from "@/lib/fallback-header-nav";
import { isLocale } from "@/lib/i18n";
import { withCanonical } from "@/lib/page-metadata";
import { listPublishedSummaries } from "@/lib/queries/posts";
import { getSiteLayoutData } from "@/lib/queries/site";
import { listVisibleHomeServiceCards } from "@/lib/queries/home-service-cards";
import { listVisibleHomeTeamHighlights } from "@/lib/queries/home-team-highlights";
import { resolveHeroBackgroundUrl } from "@/lib/fallback-hero-video";
import { SITE_STRING_DEFAULTS } from "@/lib/site-fields";
import type { HomeServiceCard } from "@/lib/queries/home-service-cards";
import type { HomeTeamHighlight } from "@/lib/queries/home-team-highlights";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const defaults = SITE_STRING_DEFAULTS[raw];
  return withCanonical(`/${raw}`, {
    title: defaults["org.brand"],
    description: defaults["hero.subtitle"].slice(0, 160),
  });
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();

  let s = SITE_STRING_DEFAULTS[raw];
  let nav: Awaited<ReturnType<typeof getSiteLayoutData>>["nav"] = [];
  let heroBgUrl: string | null = null;
  let teamHomePortraitUrls: string[] = [];
  try {
    const data = await getSiteLayoutData(raw);
    s = data.s;
    nav = data.nav;
    heroBgUrl = resolveHeroBackgroundUrl(data.heroBgUrl);
    teamHomePortraitUrls = data.teamHomePortraitUrls;
  } catch (e) {
    console.error("[LocaleHomePage getSiteLayoutData]", e);
    heroBgUrl = resolveHeroBackgroundUrl(null);
  }

  let posts: Awaited<ReturnType<typeof listPublishedSummaries>> = [];
  let dbError: string | null = null;
  try {
    posts = await listPublishedSummaries(raw);
  } catch (e) {
    console.error(e);
    if (isDbConnectionError(e)) {
      dbError = getDbConnectionUserMessage(e);
    } else {
      dbError = "Greška pri učitavanju članaka.";
    }
  }

  let serviceCards: HomeServiceCard[] = [];
  try {
    serviceCards = await listVisibleHomeServiceCards(raw);
  } catch (e) {
    console.error("[LocaleHomePage listVisibleHomeServiceCards]", e);
  }

  let teamHighlights: HomeTeamHighlight[] = [];
  try {
    teamHighlights = await listVisibleHomeTeamHighlights(raw);
  } catch (e) {
    console.error("[LocaleHomePage listVisibleHomeTeamHighlights]", e);
  }

  const navResolved = await resolveHeaderNav(
    nav.length > 0 ? nav : FALLBACK_HEADER_NAV,
    raw,
  );

  return (
    <main className="flex flex-col">
      <HomePageView
        locale={raw}
        s={s}
        nav={navResolved}
        posts={posts}
        dbError={dbError}
        heroBgUrl={heroBgUrl}
        teamHomePortraitUrls={teamHomePortraitUrls}
        serviceCards={serviceCards}
        teamHighlights={teamHighlights}
      />
    </main>
  );
}
