import Link from "next/link";

import type { PostSummary } from "@/lib/queries/posts";
import type { Locale } from "@/lib/i18n";
import type { PublicNavItem } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/queries/site";
import type { SiteStringKey } from "@/lib/site-fields";
import { HeroRotatingTaglines } from "@/components/site/hero-rotating-taglines";
type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  nav: PublicNavItem[];
  posts: PostSummary[];
  dbError: string | null;
  heroBgUrl?: string | null;
};

export function HomePageView({ locale, s, nav, posts, dbError, heroBgUrl }: Props) {
  const usluge = nav.find((n) => n.href === "#usluge");
  const serviceCards = usluge?.children ?? [];

  const rotateKeys = [
    "hero.rotate.1",
    "hero.rotate.2",
    "hero.rotate.3",
    "hero.rotate.4",
  ] as const satisfies readonly SiteStringKey[];
  const rotateLines = rotateKeys.map((k) => s[k].trim()).filter(Boolean);
  const bannerLines =
    rotateLines.length > 0 ? rotateLines : [s["hero.line2"].trim()].filter(Boolean);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-white/35 via-teal-50/25 to-white/40">
        {heroBgUrl ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] scale-110 bg-cover bg-center opacity-[0.22] motion-safe:animate-hero-drift"
            style={{ backgroundImage: `url(${heroBgUrl})` }}
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, rgba(13,148,136,0.1), transparent 46%), radial-gradient(circle at 82% 12%, rgba(15,118,110,0.06), transparent 40%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24 lg:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700/80">
            {s["org.subtitle"]}
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            <span className="block">{s["hero.line1"]}</span>
            <HeroRotatingTaglines lines={bannerLines} />
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            {s["hero.subtitle"]}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={resolvePublicHref(locale, "#kontakt")}
              className="inline-flex rounded-full bg-teal-700 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-teal-800"
            >
              {s["hero.cta_primary"]}
            </Link>
            <Link
              href={resolvePublicHref(locale, "#usluge")}
              className="inline-flex rounded-full border-2 border-slate-200 bg-white px-8 py-3 text-sm font-semibold text-slate-800 transition hover:border-teal-600 hover:text-teal-800"
            >
              {s["hero.cta_secondary"]}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 md:px-6">
          {(
            [
              ["stat1.value", "stat1.label"],
              ["stat2.value", "stat2.label"],
              ["stat3.value", "stat3.label"],
              ["stat4.value", "stat4.label"],
            ] as const
          ).map(([vk, lk]) => (
            <div key={vk} className="text-center lg:text-left">
              <p className="font-serif text-3xl font-semibold text-teal-800 md:text-4xl">
                {s[vk]}
              </p>
              <p className="mt-2 text-sm leading-snug text-slate-600">{s[lk]}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="usluge" className="scroll-mt-24 px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif text-3xl font-semibold text-slate-900 md:text-4xl">
            {s["section.services_title"]}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">{s["section.services_subtitle"]}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {serviceCards.map((card) => (
              <Link
                key={card.id}
                href={resolvePublicHref(locale, card.href)}
                id={card.href.replace(/^#/, "")}
                className="group scroll-mt-28 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-teal-200 hover:shadow-md"
              >
                <h3 className="font-serif text-lg font-semibold text-slate-900 group-hover:text-teal-800">
                  {card.label}
                </h3>
                <p className="mt-2 text-sm text-teal-700 opacity-0 transition group-hover:opacity-100">
                  →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="o-nama" className="scroll-mt-24 bg-slate-50 px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-slate-900">
              {s["section.about_title"]}
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">{s["section.about_lead"]}</p>
          </div>
          <div
            id="tim"
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
              {s["stat4.label"]}
            </p>
            <p className="mt-3 text-slate-600">{s["hero.subtitle"]}</p>
          </div>
        </div>
      </section>

      <section id="novosti" className="scroll-mt-24 px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif text-3xl font-semibold text-slate-900">
            {s["section.news_title"]}
          </h2>
          {dbError && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {dbError}
            </p>
          )}
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {!dbError && posts.length === 0 ? (
              <li className="text-slate-500 sm:col-span-2">
                Još nema objavljenih članaka.
              </li>
            ) : (
              posts.map((item) => (
                <li key={item.postId}>
                  <Link
                    href={`/${locale}/posts/${item.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-teal-200 hover:shadow-md sm:flex-row"
                  >
                    {item.coverUrl ? (
                      <div className="relative h-48 w-full shrink-0 bg-slate-100 sm:h-auto sm:min-h-[200px] sm:w-[42%]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.coverUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    ) : (
                      <div className="flex h-32 shrink-0 items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 text-sm text-slate-400 sm:h-auto sm:w-[42%] sm:min-h-[200px]">
                        Novost
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-center p-5">
                      <span className="font-serif text-lg font-semibold text-slate-900 group-hover:text-teal-800">
                        {item.title}
                      </span>
                      <span className="mt-2 text-sm text-teal-700 opacity-0 transition group-hover:opacity-100">
                        Pročitaj →
                      </span>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="bg-teal-900 px-4 py-14 text-center md:px-6">
        <p className="font-serif text-2xl font-semibold text-white md:text-3xl">
          {s["hero.cta_primary"]}
        </p>
        <p className="mt-2 text-teal-100/90">{s["contact.phone1"]} · {s["contact.email"]}</p>
        <Link
          href={resolvePublicHref(locale, "#kontakt")}
          className="mt-6 inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-teal-900 shadow transition hover:bg-teal-50"
        >
          {s["header.cta_book"]}
        </Link>
      </section>
    </>
  );
}
