import Link from "next/link";

import { FadeIn } from "@/components/site/fade-in";

export type StoryBlock = {
  eyebrow: string;
  heading: string;
  body: string;
  cta: string;
  ctaHref: string;
  image: string;
  reverse: boolean;
};

const SECTION_BG = [
  "site-section-scrim",
  "site-section-scrim",
  "site-section-scrim",
  "site-section-scrim",
] as const;

type Props = { stories: StoryBlock[] };

export function HomeStorySection({ stories }: Props) {
  return (
    <div id="o-nama" className="scroll-mt-24">
      {stories.map((story, idx) => {
        const imgLeft = story.reverse;
        const bgCls = SECTION_BG[idx % SECTION_BG.length]!;
        return (
          <div
            key={`${story.heading}-${idx}`}
            className={["relative overflow-hidden", bgCls].join(" ")}
          >
            <div className="mx-auto max-w-7xl px-6 py-section-y lg:px-16">
              <div
                className={[
                  "group/card flex flex-col gap-0 overflow-hidden rounded-2xl border border-site-border bg-site-card shadow-site-card-lg transition-shadow duration-500 hover:shadow-site-lift lg:flex-row lg:rounded-[1.75rem]",
                  imgLeft ? "lg:flex-row-reverse" : "",
                ].join(" ")}
              >
                <div className="relative min-h-[280px] w-full overflow-hidden lg:w-1/2 lg:min-h-[460px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-[center_22%] transition-transform duration-700 ease-out group-hover/card:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/[0.12] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-zinc-950/[0.06]" />
                  <div
                    className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                    aria-hidden
                  />
                  <div
                    className={[
                      "absolute top-[12%] bottom-[12%] w-px bg-gradient-to-b from-transparent via-site-brand/50 to-transparent",
                      imgLeft ? "left-0" : "right-0",
                    ].join(" ")}
                  />
                </div>

                <div
                  className="relative flex w-full flex-col justify-center bg-site-card px-8 py-12 lg:w-1/2 lg:px-14 lg:py-16"
                >
                  <FadeIn>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-site-brand">
                      {story.eyebrow}
                    </p>
                    <h2
                      style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                      className="text-[clamp(2rem,3.5vw,3.2rem)] font-normal leading-[1.1] tracking-tight text-site-ink"
                    >
                      {story.heading}
                    </h2>
                    <div className="my-5 flex items-center gap-3">
                      <span className="h-0.5 w-12 rounded-full bg-site-brand/60" />
                    </div>
                    <p className="max-w-md text-[15px] leading-[1.9] text-site-muted">{story.body}</p>
                    {story.ctaHref.startsWith("http") ? (
                      <a
                        href={story.ctaHref}
                        className="mt-9 inline-flex w-fit items-center gap-2 border-b-2 border-site-brand/30 pb-1 text-xs font-semibold uppercase tracking-[0.22em] text-site-ink transition-colors hover:border-site-brand hover:text-site-brand"
                      >
                        <span>{story.cta}</span>
                        <span
                          aria-hidden
                          className="text-site-brand transition-transform group-hover/card:translate-x-0.5"
                        >
                          →
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={story.ctaHref}
                        className="mt-9 inline-flex w-fit items-center gap-2 border-b-2 border-site-brand/30 pb-1 text-xs font-semibold uppercase tracking-[0.22em] text-site-ink transition-colors hover:border-site-brand hover:text-site-brand"
                      >
                        <span>{story.cta}</span>
                        <span
                          aria-hidden
                          className="text-site-brand transition-transform group-hover/card:translate-x-0.5"
                        >
                          →
                        </span>
                      </Link>
                    )}
                  </FadeIn>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
