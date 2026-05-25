import { HomeCtaMotrenko } from "@/components/site/home-cta-motrenko";
import { HomeHeroMotrenko } from "@/components/site/home-hero-motrenko";
import { HomeNewsMotrenko } from "@/components/site/home-news-motrenko";
import { HomeServicesMotrenko } from "@/components/site/home-services-motrenko";
import type { HomeStatItem } from "@/components/site/home-stats-motrenko";
import { HomeStatsMotrenko } from "@/components/site/home-stats-motrenko";
import {
  HomeTeamTeaser,
  type HomeTeamHighlightCard,
  type HomeTeamMember,
} from "@/components/site/home-team-teaser";
import type { HomeTeamHighlight } from "@/lib/queries/home-team-highlights";
import type { PostSummary } from "@/lib/queries/posts";
import type { Locale } from "@/lib/i18n";
import type { PublicNavItem } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/queries/site";
import type { HomeServiceCard } from "@/lib/queries/home-service-cards";
import { STAT_BG_IMAGES, TEAM_HOME_PORTRAIT_FALLBACKS } from "@/lib/clinic-assets";
import { isHeroBackgroundVideoUrl } from "@/lib/hero-background-media";
import type { SiteStringKey } from "@/lib/site-fields";

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  nav: PublicNavItem[];
  posts: PostSummary[];
  dbError: string | null;
  heroBgUrl?: string | null;
  teamHomePortraitUrls?: string[];
  serviceCards: HomeServiceCard[];
  teamHighlights: HomeTeamHighlight[];
};

export function HomePageView({
  locale,
  s,
  nav,
  posts,
  dbError,
  heroBgUrl,
  teamHomePortraitUrls,
  serviceCards,
  teamHighlights,
}: Props) {

  const stats: HomeStatItem[] = [
    {
      valueRaw: s["stat1.value"],
      label: s["stat1.label"],
      bgImage: STAT_BG_IMAGES[0],
      bgPosition: "center 35%",
    },
    {
      valueRaw: s["stat2.value"],
      label: s["stat2.label"],
      bgImage: STAT_BG_IMAGES[1],
      bgPosition: "center 45%",
    },
    {
      valueRaw: s["stat3.value"],
      label: s["stat3.label"],
      bgImage: STAT_BG_IMAGES[2],
      bgPosition: "center 38%",
    },
    {
      valueRaw: s["stat4.value"],
      label: s["stat4.label"],
      bgImage: STAT_BG_IMAGES[3],
      bgPosition: "center 30%",
    },
  ];

  const teamFromNav = nav
    .flatMap((r) => [r, ...r.children])
    .find((n) => {
      const h = n.href.trim().toLowerCase();
      return h.includes("#tim") || n.label.toLowerCase().includes("tim");
    });
  const teamHref = teamFromNav
    ? resolvePublicHref(locale, teamFromNav.href)
    : `/${locale}#tim`;

  const rotateKeys = [
    "hero.rotate.1",
    "hero.rotate.2",
    "hero.rotate.3",
    "hero.rotate.4",
  ] as const satisfies readonly SiteStringKey[];
  const rotateLines = rotateKeys.map((k) => s[k].trim()).filter(Boolean);
  const bannerLines =
    rotateLines.length > 0 ? rotateLines : [s["hero.line2"].trim()].filter(Boolean);

  /** Spriječi dupli naslov kad CMS ili migracija ponovi istu frazu u line1 i rotate/line2. */
  function combineHeroHeading(line1: string, second: string): string {
    const a = line1.trim();
    const b = second.trim();
    if (!b) return a;
    const an = a.replace(/\s+/g, " ");
    const bn = b.replace(/\s+/g, " ");
    if (an === bn) return a;
    if (an.includes(bn) || bn.includes(an)) return an.length >= bn.length ? a : b;
    return `${a}\n${second.trim()}`;
  }

  const firstBanner = bannerLines[0] ?? s["hero.line2"];

  const heroSlides = [
    {
      eyebrow: s["org.brand"].toUpperCase(),
      heading: combineHeroHeading(s["hero.line1"], firstBanner),
      sub: s["hero.subtitle"],
    },
    {
      eyebrow: s["section.services_title"],
      heading: bannerLines[1] ?? bannerLines[0] ?? s["hero.line1"],
      sub: s["section.services_subtitle"],
    },
    {
      eyebrow: s["section.about_title"],
      heading: bannerLines[2] ?? s["hero.line1"],
      sub: s["section.about_lead"],
    },
  ];

  const portraitFallback = [...TEAM_HOME_PORTRAIT_FALLBACKS];
  const portraitUrls =
    teamHomePortraitUrls && teamHomePortraitUrls.length >= 4
      ? teamHomePortraitUrls
      : portraitFallback;

  const teamMembers: HomeTeamMember[] = [1, 2, 3, 4].map((n, i) => ({
    imageSrc: portraitUrls[i] ?? portraitFallback[i]!,
    name: s[`team.m${n}.name` as SiteStringKey],
    role: s[`team.m${n}.role` as SiteStringKey],
  }));

  const highlightCards: HomeTeamHighlightCard[] =
    teamHighlights.length > 0
      ? teamHighlights.map((h) => ({
          title: h.title,
          body: h.teaser ?? "",
          href: h.href,
        }))
      : [
          { title: s["team.hl1.title"], body: s["team.hl1.body"] },
          { title: s["team.hl2.title"], body: s["team.hl2.body"] },
          { title: s["team.hl3.title"], body: s["team.hl3.body"] },
        ];

  const heroVideoPreload =
    heroBgUrl && isHeroBackgroundVideoUrl(heroBgUrl) ? heroBgUrl : null;

  return (
    <>
      {heroVideoPreload ? (
        <link rel="preload" as="video" href={heroVideoPreload} fetchPriority="high" />
      ) : null}
      <HomeHeroMotrenko
        slides={heroSlides}
        mediaUrl={heroBgUrl ?? null}
        primaryCta={{
          label: s["hero.cta_primary"],
          href: resolvePublicHref(locale, s["hero.cta_primary_href"]),
        }}
        secondaryCta={{
          label: s["hero.cta_secondary"],
          href: resolvePublicHref(locale, s["hero.cta_secondary_href"]),
        }}
      />

      {/* Sekcije — GlobalBackdrop (iz root layout-a) prolazi kroz sve */}
      <HomeStatsMotrenko items={stats} />

      <HomeServicesMotrenko
        locale={locale}
        eyebrow={s["org.subtitle"]}
        heading={s["section.services_title"]}
        lead={s["section.services_subtitle"]}
        moreLabel="Više"
        cards={serviceCards}
      />

      <HomeTeamTeaser
        locale={locale}
        eyebrow={s["team.eyebrow"]}
        title={s["team.title"]}
        lead={s["team.lead"]}
        featuredBio={s["team.m1.bio"]}
        aboutHref={teamHref}
        ctaLabel={s["team.cta"]}
        members={teamMembers.slice(0, 1)}
        highlights={highlightCards}
      />

      <HomeNewsMotrenko
        locale={locale}
        eyebrow={s["home.news_eyebrow"]}
        heading={s["section.news_title"]}
        readLabel={s["home.news_read_label"]}
        archiveHref={`/${locale}#novosti`}
        posts={dbError ? [] : posts}
        loadError={dbError}
      />

      <HomeCtaMotrenko
        locale={locale}
        privacyHref={resolvePublicHref(locale, s["footer.privacy_href"])}
        s={s}
        eyebrow={s["home.cta_eyebrow"]}
        headingLine1={s["home.cta_heading_line1"]}
        headingLine2={s["home.cta_heading_line2"]}
      />
    </>
  );
}
