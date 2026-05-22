import type { AdminPostRow } from "@/lib/queries/posts";
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

export function isEmbriologistTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  return /embriolog/.test(t) && !isDoctorTitle(title);
}

export function isNurseTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  return /sestr|medicinsk[aio].*tehni|tehničar|tehnicar|koordinator/.test(t);
}

export type AdminTeamGroup = "doctors" | "embriologists" | "nurses" | "other";

export function adminTeamGroupForTitle(title: string): AdminTeamGroup {
  if (isDoctorTitle(title)) return "doctors";
  if (isEmbriologistTitle(title)) return "embriologists";
  if (isNurseTitle(title)) return "nurses";
  return "other";
}

function teamSlugRank(slug: string | null | undefined): number {
  if (!slug) return 999;
  const index = TEAM_DISPLAY_ORDER.indexOf(
    slug as (typeof TEAM_DISPLAY_ORDER)[number],
  );
  return index === -1 ? 999 : index;
}

/** Admin lista tima: doktori, embriolozi, sestre — redoslijed kao na /s/tim. */
export function groupAdminTeamPosts(rows: AdminPostRow[]): {
  doctors: AdminPostRow[];
  embriologists: AdminPostRow[];
  nurses: AdminPostRow[];
  other: AdminPostRow[];
} {
  const sortRows = (items: AdminPostRow[]) =>
    [...items].sort((a, b) => {
      const ra = teamSlugRank(a.slugMe);
      const rb = teamSlugRank(b.slugMe);
      if (ra !== rb) return ra - rb;
      return (a.titleMe ?? "").localeCompare(b.titleMe ?? "", "sr-Latn");
    });

  const doctors: AdminPostRow[] = [];
  const embriologists: AdminPostRow[] = [];
  const nurses: AdminPostRow[] = [];
  const other: AdminPostRow[] = [];

  for (const row of rows) {
    const group = adminTeamGroupForTitle(row.titleMe ?? "");
    if (group === "doctors") doctors.push(row);
    else if (group === "embriologists") embriologists.push(row);
    else if (group === "nurses") nurses.push(row);
    else other.push(row);
  }

  return {
    doctors: sortRows(doctors),
    embriologists: sortRows(embriologists),
    nurses: sortRows(nurses),
    other: sortRows(other),
  };
}

/** Redoslijed prikaza na /s/tim (iznad = ranije). */
export const TEAM_DISPLAY_ORDER = [
  "mr-sci-dr-tatjana-motrenko-simic",
  "dr-marija-petricevic",
  "sasa-lozo",
  "jelena-popovic-klinicki-embriolog",
  "jasna-mijanovic-embriolog",
  "milena-radulovic-visa-med-sestra-glavna-sestra",
  "maja-scekic-visa-med-sestra-koordinator-za-ivf",
  "aleksandra-obradovic-medicinska-sestra-tehnicar",
  "marina-colic-medicinski-tehnicar-sestra",
] as const;

export const TEAM_FEATURED_SLUG = "mr-sci-dr-tatjana-motrenko-simic";

export function sortTeamMembersForDisplay(
  members: TeamMemberSummary[],
): TeamMemberSummary[] {
  const rank = new Map<string, number>(
    TEAM_DISPLAY_ORDER.map((slug, index) => [slug, index]),
  );

  return [...members].sort((a, b) => {
    const ra = rank.get(a.slug) ?? 999;
    const rb = rank.get(b.slug) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title, "sr-Latn");
  });
}

export function splitFeaturedTeamMember(members: TeamMemberSummary[]): {
  featured: TeamMemberSummary | null;
  roster: TeamMemberSummary[];
} {
  const ordered = sortTeamMembersForDisplay(members);
  const featured =
    ordered.find((m) => m.slug === TEAM_FEATURED_SLUG) ??
    ordered.find((m) => /motrenko/i.test(m.title)) ??
    null;
  const roster = featured
    ? ordered.filter((m) => m.slug !== featured.slug)
    : ordered;
  return { featured, roster };
}
