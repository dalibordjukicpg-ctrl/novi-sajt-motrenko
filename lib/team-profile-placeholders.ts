import type { TeamMemberSummary } from "@/lib/queries/posts";

const PLACEHOLDER_PATTERNS = [
  /u\s+pripremi/i,
  /\[ime\s+i\s+prezime\]/i,
  /^\s*dr\s*\[\s*ime/i,
  /placeholder/i,
  /uskoro/i,
  /coming\s+soon/i,
];

/** Skriva profile tima bez stvarne biografije (CMS placeholder). */
export function isPlaceholderTeamProfile(member: TeamMemberSummary): boolean {
  const title = member.title.trim();
  const excerpt = (member.excerpt ?? "").trim();

  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(title) || re.test(excerpt)) return true;
  }

  if (!excerpt && /\[ime|pripremi|tbd|xxx/i.test(title)) return true;

  return false;
}

export function filterPublishedTeamMembers(
  members: TeamMemberSummary[],
): TeamMemberSummary[] {
  return members.filter((m) => !isPlaceholderTeamProfile(m));
}
