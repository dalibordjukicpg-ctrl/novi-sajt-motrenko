import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import {
  getPostSlugForLocale,
  resolvePublishedPostIdForSlug,
} from "@/lib/post-locale-resolve";

/** Dozvoljava samo interne putanje oblika `/me/...` ili `/en/...`. */
export function sanitizeLocaleSwitchPath(path: string): string | null {
  const trimmed = path.trim();
  const noQuery = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (!noQuery.startsWith("/")) return null;
  if (noQuery.includes("..")) return null;
  const segments = noQuery.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  if (!isLocale(segments[0]!)) return null;
  return noQuery;
}

/**
 * Ciljani href pri promjeni jezika. Za postove: ako u bazi nema slug-a za ciljni jezik,
 * vraća početnicu tog jezika (direktan URL i dalje može koristiti fallback prikaza).
 */
export async function resolveLocaleSwitchHref(
  pathname: string,
  targetLocale: Locale,
): Promise<string> {
  const clean = sanitizeLocaleSwitchPath(pathname);
  if (!clean) return `/${targetLocale}`;

  const segments = clean.split("/").filter(Boolean);
  const sourceLocale = segments[0] as Locale;
  const tail = segments.slice(1);

  if (tail.length === 0) {
    return `/${targetLocale}`;
  }

  if (tail[0] === "posts" && tail[1] && tail.length === 2) {
    const slug = tail[1];
    const postId = await resolvePublishedPostIdForSlug(slug, sourceLocale);
    if (!postId) return `/${targetLocale}`;
    const targetSlug = await getPostSlugForLocale(postId, targetLocale);
    if (!targetSlug) return `/${targetLocale}`;
    return `/${targetLocale}/posts/${targetSlug}`;
  }

  return `/${targetLocale}/${tail.join("/")}`;
}
