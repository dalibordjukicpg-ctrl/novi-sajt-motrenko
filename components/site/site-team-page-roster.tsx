import Image from "next/image";
import Link from "next/link";

import { CLINIC_PAGE_HERO_BG } from "@/lib/clinic-assets";
import type { Locale } from "@/lib/i18n";
import type { TeamMemberSummary } from "@/lib/queries/posts";
import { splitFeaturedTeamMember } from "@/lib/team-roster-order";
import { resolveTeamCardExcerpt } from "@/lib/team-profile-placeholders";

const CARD_MIN_H = "min-h-[260px]";

function MemberPhoto({
  coverUrl,
  className = "",
  sizes,
  priority = false,
}: {
  coverUrl: string | null;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  const src = coverUrl && coverUrl.length > 0 ? coverUrl : CLINIC_PAGE_HERO_BG;
  const isLocal = src.startsWith("/");

  if (isLocal) {
    return (
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        priority={priority}
        sizes={sizes}
        className={`object-cover object-[center_12%] select-none ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`absolute inset-0 h-full w-full object-cover object-[center_12%] select-none ${className}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

function FeaturedMemberCard({
  locale,
  m,
}: {
  locale: Locale;
  m: TeamMemberSummary;
}) {
  const excerpt = resolveTeamCardExcerpt(m, 320);

  return (
    <Link
      href={`/${locale}/posts/${m.slug}`}
      className="group block overflow-hidden rounded-[1.35rem] border border-site-brand/20 bg-gradient-to-br from-white via-site-surface-c to-site-surface-a shadow-site-lift transition hover:border-site-brand/35 hover:shadow-[0_24px_56px_-20px_rgba(243,112,33,0.22)]"
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,17rem)_1fr] md:items-stretch">
        <div className="relative aspect-[4/5] min-h-[17rem] max-h-[28rem] bg-site-surface-a md:max-h-none md:min-h-[22rem]">
          <MemberPhoto
            coverUrl={m.coverUrl}
            sizes="(min-width: 768px) 272px, 88vw"
            priority
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/[0.04]"
          />
        </div>
        <div className="flex flex-col justify-center px-6 py-7 sm:px-8 sm:py-8 md:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-site-brand">
            Vođa kliničkog tima
          </p>
          <h2
            className="mt-3 font-serif text-[clamp(1.55rem,3vw,2.15rem)] font-semibold leading-tight text-site-ink transition group-hover:text-site-brand-muted"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {m.title}
          </h2>
          {excerpt ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
              {excerpt}
            </p>
          ) : null}
          <span className="mt-6 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-site-brand">
            Profil i biografija <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function MemberCard({
  locale,
  m,
}: {
  locale: Locale;
  m: TeamMemberSummary;
}) {
  const excerpt = resolveTeamCardExcerpt(m);

  return (
    <li className="flex h-full">
      <Link
        href={`/${locale}/posts/${m.slug}`}
        className={`group flex ${CARD_MIN_H} h-full w-full gap-4 rounded-2xl border border-site-border bg-site-card p-4 shadow-site-card transition hover:border-site-brand/25 hover:shadow-site-lift`}
      >
        <div className="relative min-h-[11.5rem] w-[8.25rem] shrink-0 self-stretch overflow-hidden rounded-xl bg-site-surface-a ring-1 ring-site-border sm:w-[8.75rem]">
          <MemberPhoto
            coverUrl={m.coverUrl}
            sizes="(min-width: 640px) 148px, 132px"
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col py-0.5">
          <p className="font-serif text-lg font-semibold leading-snug text-site-ink transition group-hover:text-site-brand-muted">
            {m.title}
          </p>
          <p className="mt-2 min-h-[5.25rem] flex-1 text-sm leading-relaxed text-zinc-600">
            {excerpt ? (
              <span className="line-clamp-4">{excerpt}</span>
            ) : (
              <span className="text-zinc-300">—</span>
            )}
          </p>
          <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-site-brand">
            Detalji <span aria-hidden>→</span>
          </span>
        </div>
      </Link>
    </li>
  );
}

function MemberGrid({ locale, members }: { locale: Locale; members: TeamMemberSummary[] }) {
  return (
    <ul className="grid list-none gap-5 sm:grid-cols-2 sm:items-stretch">
      {members.map((m) => (
        <MemberCard key={m.slug} locale={locale} m={m} />
      ))}
    </ul>
  );
}

export function SiteTeamPageRoster({
  locale,
  members,
}: {
  locale: Locale;
  members: TeamMemberSummary[];
}) {
  if (members.length === 0) return null;

  const { featured, roster } = splitFeaturedTeamMember(members);

  return (
    <div className="space-y-10" aria-label="Članovi tima">
      {featured ? (
        <section className="space-y-4">
          <FeaturedMemberCard locale={locale} m={featured} />
        </section>
      ) : null}

      {roster.length > 0 ? (
        <section className="space-y-4">
          <h2 className="border-b border-[#f0e6dc] pb-2 font-serif text-xl font-semibold tracking-tight text-zinc-900">
            Naš tim
          </h2>
          <MemberGrid locale={locale} members={roster} />
        </section>
      ) : null}
    </div>
  );
}
