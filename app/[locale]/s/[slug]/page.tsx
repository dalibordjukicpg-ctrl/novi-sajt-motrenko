import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/forms/contact-form";
import { PageHero } from "@/components/site/page-hero";
import { SiteInnerSidebar } from "@/components/site/site-inner-sidebar";
import { SiteTeamPageRoster } from "@/components/site/site-team-page-roster";
import { CLINIC_PAGE_HERO_BG } from "@/lib/clinic-assets";
import { getDbConnectionUserMessage, isDbConnectionError } from "@/lib/db-errors";
import { FALLBACK_HEADER_NAV, resolveHeaderNav } from "@/lib/fallback-header-nav";
import { isLocale } from "@/lib/i18n";
import { getPublishedSitePage } from "@/lib/queries/site-pages";
import { listPublishedTeamSummaries } from "@/lib/queries/posts";
import { getHomeBreadcrumbLabel, getSiteLayoutData } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import { stripTimPregledSection } from "@/lib/public-cms-html";
import { getONamaInnerPageContext } from "@/lib/site-page-inner-layout";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  try {
    const page = await getPublishedSitePage(raw, slug);
    if (!page) return {};
    return { title: page.title };
  } catch {
    return { title: "Stranica" };
  }
}

export default async function SitePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();

  let page: Awaited<ReturnType<typeof getPublishedSitePage>>;
  try {
    page = await getPublishedSitePage(raw, slug);
  } catch (e) {
    console.error(e);
    return (
      <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-transparent">
        <article className="mx-auto max-w-3xl px-6 py-10 lg:px-16">
          <Link
            href={`/${raw}`}
            className="text-[11px] font-medium uppercase tracking-[0.25em] text-site-brand hover:underline"
          >
            ← Početna
          </Link>
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isDbConnectionError(e)
              ? getDbConnectionUserMessage(e)
              : "Greška pri učitavanju stranice."}
          </p>
        </article>
      </main>
    );
  }

  if (!page) notFound();

  let teamRoster: Awaited<ReturnType<typeof listPublishedTeamSummaries>> = [];
  if (slug === "tim") {
    try {
      teamRoster = await listPublishedTeamSummaries(raw);
    } catch (e) {
      console.error("[SitePage listPublishedTeamSummaries]", e);
    }
  }
  const showTeamRoster = slug === "tim" && teamRoster.length > 0;
  const articleHtml = showTeamRoster
    ? stripTimPregledSection(page.body)
    : page.body;

  let navResolved = await resolveHeaderNav(FALLBACK_HEADER_NAV, raw);
  let privacyHref = resolvePublicHref(raw, "/s/politika-privatnosti");
  try {
    const layout = await getSiteLayoutData(raw);
    navResolved = await resolveHeaderNav(
      layout.nav.length > 0 ? layout.nav : FALLBACK_HEADER_NAV,
      raw,
    );
    privacyHref = resolvePublicHref(
      raw,
      layout.s["footer.privacy_href"] || "/s/politika-privatnosti",
    );
  } catch (e) {
    console.error(e);
  }

  const innerNav = getONamaInnerPageContext(raw, slug, navResolved);
  const homeCrumb = await getHomeBreadcrumbLabel(raw);
  const breadcrumbs = [
    { label: homeCrumb, href: `/${raw}` },
    ...(innerNav
      ? [{ label: innerNav.sectionLabel.toUpperCase(), href: innerNav.sectionHref }]
      : []),
  ];

  const articleInner = innerNav
    ? "wp-content wp-content--article wp-content--inner-panel site-card-elevated-lg max-w-none px-6 py-8 backdrop-blur-sm sm:px-10 sm:py-10"
    : "wp-content wp-content--article max-w-3xl";

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-transparent">
      <PageHero backgroundImage={CLINIC_PAGE_HERO_BG} breadcrumbs={breadcrumbs}>
        <h1
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          className="max-w-[95vw] text-[clamp(1.85rem,6.5vw,3.5rem)] font-light leading-[1.08] tracking-tight text-zinc-900 [text-shadow:0_1px_24px_rgba(255,255,255,0.9),0_0_1px_rgba(255,255,255,0.95)] sm:max-w-none sm:leading-[1.05]"
        >
          {page.title}
        </h1>
        <div className="mt-5 h-0.5 w-14 bg-site-brand sm:mt-6 sm:w-16" />
      </PageHero>

      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-12 lg:px-12">
        {innerNav ? (
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
            <SiteInnerSidebar
              sectionTitle={innerNav.sectionLabel}
              sectionHref={innerNav.sectionHref}
              items={innerNav.items}
              activeSlug={slug}
            />
            <div className="min-w-0 flex-1">
              {showTeamRoster ? (
                <div className="mb-10">
                  <SiteTeamPageRoster locale={raw} members={teamRoster} />
                </div>
              ) : null}
              {articleHtml ? (
                <article
                  className={articleInner}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
              ) : !showTeamRoster ? (
                <p className="rounded-xl border border-[#f0e6dc] bg-white/80 px-5 py-6 text-sm text-zinc-600">
                  Sadržaj ove stranice još nije dodat. Uredite stranicu u admin panelu ili
                  objavite profile tima (Blog → uloga „tim“) sa naslovnom slikom.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            {showTeamRoster ? (
              <div className="mb-10">
                <SiteTeamPageRoster locale={raw} members={teamRoster} />
              </div>
            ) : null}
            {articleHtml ? (
              <article
                className={articleInner}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: articleHtml }}
              />
            ) : !showTeamRoster ? (
              <p className="rounded-xl border border-[#f0e6dc] bg-white/80 px-5 py-6 text-sm text-zinc-600">
                Sadržaj ove stranice još nije dodat. Uredite stranicu u admin panelu ili
                objavite profile tima sa naslovnom slikom.
              </p>
            ) : null}
          </div>
        )}
        {slug === "kontakt" ? (
          <section
            className="mt-14 max-w-xl scroll-mt-24"
            aria-labelledby="kontakt-form-naslov"
          >
            <h2 id="kontakt-form-naslov" className="sr-only">
              Kontakt forma
            </h2>
            <ContactForm locale={raw} privacyHref={privacyHref} />
          </section>
        ) : null}
        <div className="mt-16 pt-8">
          <Link
            href={`/${raw}`}
            className="text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:text-zinc-950"
          >
            ← Početna
          </Link>
        </div>
      </div>
    </main>
  );
}
