import type { TeamMemberSummary } from "@/lib/queries/posts";

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
