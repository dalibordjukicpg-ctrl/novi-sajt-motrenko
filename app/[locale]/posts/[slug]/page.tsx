import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/site/page-hero";
import { CLINIC_PAGE_HERO_BG } from "@/lib/clinic-assets";
import { getDbConnectionUserMessage, isDbConnectionError } from "@/lib/db-errors";
import { isLocale } from "@/lib/i18n";
import { getPublishedPostBySlug } from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  try {
    const post = await getPublishedPostBySlug(raw, slug);
    if (!post) return {};
    const title = post.metaTitle?.trim() || post.title;
    const description =
      post.metaDescription?.trim() || post.excerpt || undefined;
    return { title, description };
  } catch {
    return { title: "Članak" };
  }
}

export default async function PublicPostPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();

  let post: Awaited<ReturnType<typeof getPublishedPostBySlug>>;
  try {
    post = await getPublishedPostBySlug(raw, slug);
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
              : "Greška pri učitavanju članka."}
          </p>
        </article>
      </main>
    );
  }

  if (!post) notFound();

  const isTeam = post.contentRole === "team";
  const backHref = isTeam ? `/${raw}/s/tim` : `/${raw}#novosti`;
  const backLabel = isTeam ? "← Nazad na tim" : "← Nazad na novosti";

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-transparent">
      <PageHero backgroundImage={CLINIC_PAGE_HERO_BG}>
        <Link
          href={`/${raw}`}
          className="mb-3 inline-flex max-w-full items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-site-brand hover:underline sm:mb-4"
        >
          ← Početna
        </Link>
        <h1
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          className="max-w-[95vw] text-[clamp(1.85rem,6.5vw,3.5rem)] font-light leading-[1.08] tracking-tight text-zinc-900 [text-shadow:0_1px_24px_rgba(255,255,255,0.9),0_0_1px_rgba(255,255,255,0.95)] sm:max-w-none sm:leading-[1.05]"
        >
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-700 [text-shadow:0_1px_14px_rgba(255,255,255,0.85)]">
            {post.excerpt}
          </p>
        ) : null}
        <div className="mt-5 h-0.5 w-14 bg-site-brand sm:mt-6 sm:w-16" />
      </PageHero>

      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:py-16 lg:px-16">
        {isTeam ? (
          <div className="flex flex-col items-stretch gap-8 max-md:gap-6 lg:flex-row lg:items-start lg:gap-12 xl:gap-14">
            <div className="order-1 mx-auto w-full max-w-[min(100%,22rem)] shrink-0 self-start sm:max-w-[20rem] lg:order-none lg:mx-0 lg:w-[min(100%,20rem)] lg:max-w-[36%]">
              {post.coverUrl ? (
                <div className="relative aspect-[4/5] w-full min-h-[17.5rem] overflow-hidden rounded-2xl border border-site-border bg-site-surface-a shadow-site-lift sm:min-h-[19rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverUrl}
                    alt={post.title}
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-[center_12%]"
                  />
                </div>
              ) : null}
            </div>
            <div className="order-2 min-w-0 flex-1 lg:order-none lg:max-w-none">
              {post.body?.trim() ? (
                <article
                  className="wp-content wp-content--article max-w-3xl text-zinc-800 lg:max-w-none wp-content--team-profile"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: post.body }}
                />
              ) : (
                <p className="text-sm text-zinc-500">
                  Biografija još nije unesena. Dodajte tekst u adminu (uredi članak).
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {post.coverUrl ? (
              <div className="relative -mt-8 mb-10 aspect-[21/9] max-h-[min(360px,36vh)] w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}
            {post.body ? (
              <article
                className="wp-content wp-content--article max-w-3xl"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: post.body }}
              />
            ) : null}
          </>
        )}
        <div className="mt-16 pt-8">
          <Link
            href={backHref}
            className="text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:text-zinc-950"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
