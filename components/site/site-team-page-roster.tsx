import Link from "next/link";

import { CLINIC_PAGE_HERO_BG } from "@/lib/clinic-assets";
import type { Locale } from "@/lib/i18n";
import type { TeamMemberSummary } from "@/lib/queries/posts";
import { splitFeaturedTeamMember } from "@/lib/team-roster-order";

/** Doktori: naslov počinje sa dr / doktor ili „mr sci dr …“ (kao u importu). */
export function isDoctorTitle(title: string): boolean {
  const t = title.trim().toLowerCase().replace(/\u00a0/g, " ");
  if (/^mr\s+sci\s+dr\b/.test(t)) return true;
  if (/^dr[\s.]/.test(t)) return true;
  if (/^dokt(or|orka)\b/.test(t)) return true;
  if (/^prim\.?\s+mr\.?\s+dr\b/.test(t)) return true;
  if (/^mr\.?\s+dr\b/.test(t)) return true;
  return false;
}

function plainExcerpt(htmlOrText: string | null, max = 180): string {
  if (!htmlOrText) return "";
  const t = htmlOrText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const CARD_MIN_H = "min-h-[260px]";

function MemberPhoto({
  coverUrl,
  className = "",
}: {
  coverUrl: string | null;
  className?: string;
}) {
  const src = coverUrl && coverUrl.length > 0 ? coverUrl : CLINIC_PAGE_HERO_BG;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`absolute inset-0 h-full w-full object-cover object-[center_15%] transition duration-300 group-hover:scale-[1.04] select-none ${className}`}
      loading="lazy"
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
  const excerpt = plainExcerpt(m.excerpt, 320);

  return (
    <Link
      href={`/${locale}/posts/${m.slug}`}
      className="group block overflow-hidden rounded-[1.35rem] border border-site-brand/20 bg-gradient-to-br from-white via-site-surface-c to-site-surface-a shadow-site-lift transition hover:border-site-brand/35 hover:shadow-[0_24px_56px_-20px_rgba(243,112,33,0.22)]"
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,17rem)_1fr] md:items-stretch">
        <div className="relative aspect-[4/5] min-h-[17rem] max-h-[28rem] bg-site-surface-a md:max-h-none md:min-h-[22rem]">
          <MemberPhoto coverUrl={m.coverUrl} className="group-hover:scale-[1.02]" />
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
  const excerpt = plainExcerpt(m.excerpt);

  return (
    <li className="flex h-full">
      <Link
        href={`/${locale}/posts/${m.slug}`}
        className={`group flex ${CARD_MIN_H} h-full w-full gap-4 rounded-2xl border border-site-border bg-site-card p-4 shadow-site-card transition hover:border-site-brand/25 hover:shadow-site-lift`}
      >
        <div className="relative min-h-[11rem] w-[7.25rem] shrink-0 self-stretch overflow-hidden rounded-xl bg-site-surface-a ring-1 ring-site-border">
          <MemberPhoto coverUrl={m.coverUrl} />
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
