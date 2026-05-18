import { notFound } from "next/navigation";

import { HomePageView } from "@/components/site/home-page";
import { getDbConnectionUserMessage, isDbConnectionError } from "@/lib/db-errors";
import { FALLBACK_HEADER_NAV, resolveHeaderNav } from "@/lib/fallback-header-nav";
import { isLocale } from "@/lib/i18n";
import { listPublishedSummaries } from "@/lib/queries/posts";
import { getSiteLayoutData } from "@/lib/queries/site";
import { resolveHeroBackgroundUrl } from "@/lib/fallback-hero-video";
import { SITE_STRING_DEFAULTS } from "@/lib/site-fields";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

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
      />
    </main>
  );
}
