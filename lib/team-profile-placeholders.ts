import type { TeamMemberSummary } from "@/lib/queries/posts";
import { preparePublicPlainText } from "@/lib/public-cms-html";
import {
  adminTeamGroupForTitle,
  isDoctorTitle,
} from "@/lib/team-roster-order";

/** Tekst u CMS-u koji još nije zamijenjen stvarnom biografijom. */
function isPlaceholderExcerptText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /^u\s+pripremi/i.test(t) ||
    /^\[?\s*biografija\s+u\s+pripremi/i.test(t) ||
    /^uskoro$/i.test(t) ||
    /^coming\s+soon$/i.test(t)
  );
}

function isTemplateTitle(title: string): boolean {
  const t = title.trim();
  return (
    /^\s*dr\s*\[\s*ime\s+i\s+prezime\s*\]/i.test(t) ||
    /^\s*\[\s*ime\s+i\s+prezime\s*\]/i.test(t)
  );
}

/** Ne skriva profil — samo odlučuje da li kartica koristi generički opis umjesto placeholdera. */
export function shouldUseTeamFallbackBio(member: TeamMemberSummary): boolean {
  if (isTemplateTitle(member.title)) return true;
  const excerpt = preparePublicPlainText(member.excerpt);
  return isPlaceholderExcerptText(excerpt);
}

function fallbackBioForMember(member: TeamMemberSummary): string {
  const group = adminTeamGroupForTitle(member.title);
  if (group === "doctors" || isDoctorTitle(member.title)) {
    return "Specijalista u Centru za humanu reprodukciju Budva — dijagnostika, liječenje i podrška parovima.";
  }
  if (group === "embriologists") {
    return "Embriolog u laboratoriju Centra — IVF, IUI i savremena embriološka podrška.";
  }
  if (group === "nurses") {
    return "Medicinska sestra u Centru — koordinacija termina, briga o pacijentima i podrška timu.";
  }
  return "Član tima Centra za humanu reprodukciju Budva.";
}

/** Kratki tekst na kartici tima — stvarni excerpt ili profesionalni placeholder. */
export function resolveTeamCardExcerpt(
  member: TeamMemberSummary,
  max = 180,
): string {
  const plain = preparePublicPlainText(member.excerpt);
  const text = shouldUseTeamFallbackBio(member)
    ? fallbackBioForMember(member)
    : plain;
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
