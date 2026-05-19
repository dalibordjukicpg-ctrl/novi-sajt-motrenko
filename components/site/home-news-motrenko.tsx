"use client";

import Link from "next/link";

import { FadeIn } from "@/components/site/fade-in";
import { SiteCoverImage } from "@/components/site/site-cover-image";
import type { PostSummary } from "@/lib/queries/posts";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  eyebrow: string;
  heading: string;
  readLabel: string;
  /** Link „sve objave“ / sidro za blog. */
  archiveHref: string;
  posts: PostSummary[];
  /** Poruka kada članci nisu učitani (npr. greška baze). */
  loadError?: string | null;
};

export function HomeNewsMotrenko({
  locale,
  eyebrow,
  heading,
  readLabel,
  archiveHref,
  posts,
  loadError,
}: Props) {
  const err = loadError?.trim();

  return (
    <section
      id="novosti"
      className="site-section site-section-scrim-md relative z-10 scroll-mt-24 overflow-x-hidden py-section-y"
    >
      <div className="relative mx-auto max-w-7xl px-6 lg:px-16">
        <FadeIn className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-site-brand">
              {eyebrow}
            </p>
            <h2
              style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
              className="text-[clamp(1.7rem,3.2vw,2.8rem)] font-medium leading-[1.1] tracking-tight text-site-ink"
            >
              {heading}
            </h2>
          </div>
          <Link
            href={archiveHref}
            className="site-card-glass shrink-0 self-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-site-ink transition hover:text-site-brand sm:self-auto sm:text-[11px]"
          >
            Svi članci
          </Link>
        </FadeIn>

        {err ? (
          <p className="mb-8 rounded-xl border border-amber-200/80 bg-amber-50 px-5 py-4 text-sm text-amber-950">
            {err}
          </p>
        ) : null}

        {!err && posts.length === 0 ? (
          <FadeIn>
            <div className="site-card-glass px-6 py-14 text-center sm:px-12">
              <p
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                className="text-lg font-light text-site-ink"
              >
                Uskoro novi članci i savjeti iz naše prakse.
              </p>
              <p className="mt-2 text-sm text-site-muted">
                Pratite nas — sadržaj će biti objavljen na ovoj stranici.
              </p>
            </div>
          </FadeIn>
        ) : null}

        {posts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-5">
            {posts.slice(0, 6).map((post, i) => (
              <FadeIn key={post.postId} delay={((i % 3) * 100) as 0 | 100 | 200}>
                <Link
                  href={`/${locale}/posts/${post.slug}`}
                  className="group site-card-glass flex h-full flex-col overflow-hidden transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-[1.25rem] bg-site-surface-a">
                    {post.coverUrl ? (
                      <SiteCoverImage
                        src={post.coverUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-site-brand/8 via-site-surface-a to-site-brand/10"
                        aria-hidden
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-site-subtle">
                          Blog
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6 pt-5">
                    <h3
                      style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                      className="text-[clamp(1.25rem,2vw,1.65rem)] font-light leading-snug tracking-tight text-site-ink"
                    >
                      {post.title}
                    </h3>
                    <span className="mt-auto pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-site-subtle transition-colors group-hover:text-site-brand sm:text-[11px]">
                      {readLabel} →
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
