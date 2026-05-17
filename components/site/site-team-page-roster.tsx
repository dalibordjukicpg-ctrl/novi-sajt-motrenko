import Image from "next/image";
import Link from "next/link";

import { CLINIC_PAGE_HERO_BG } from "@/lib/clinic-assets";
import type { Locale } from "@/lib/i18n";
import type { TeamMemberSummary } from "@/lib/queries/posts";

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

function plainExcerpt(htmlOrText: string | null): string {
  if (!htmlOrText) return "";
  const t = htmlOrText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > 180 ? `${t.slice(0, 177)}…` : t;
}

const CARD_MIN_H = "min-h-[260px]";

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
        <div className="relative w-[7.25rem] shrink-0 self-stretch overflow-hidden rounded-xl bg-site-surface-a ring-1 ring-site-border">
          <Image
            src={m.coverUrl && m.coverUrl.length > 0 ? m.coverUrl : CLINIC_PAGE_HERO_BG}
            alt=""
            fill
            className="pointer-events-none object-cover object-[center_15%] transition duration-300 group-hover:scale-[1.04] select-none"
            sizes="116px"
            unoptimized={
              !!m.coverUrl &&
              (m.coverUrl.startsWith("http") || m.coverUrl.startsWith("//"))
            }
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

  const doctors = members.filter((m) => isDoctorTitle(m.title));
  const staff = members.filter((m) => !isDoctorTitle(m.title));

  return (
    <div className="space-y-10" aria-label="Članovi tima">
      {doctors.length > 0 ? (
        <section className="space-y-4">
          <h2 className="border-b border-[#f0e6dc] pb-2 font-serif text-xl font-semibold tracking-tight text-zinc-900">
            Ljekari
          </h2>
          <MemberGrid locale={locale} members={doctors} />
        </section>
      ) : null}

      {staff.length > 0 ? (
        <section className="space-y-4">
          <h2 className="border-b border-[#f0e6dc] pb-2 font-serif text-xl font-semibold tracking-tight text-zinc-900">
            Medicinsko osoblje
          </h2>
          <MemberGrid locale={locale} members={staff} />
        </section>
      ) : null}
    </div>
  );
}
