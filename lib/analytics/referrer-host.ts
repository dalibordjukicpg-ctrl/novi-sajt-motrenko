export function extractReferrerHost(
  referrer: string | null | undefined,
): string | null {
  if (!referrer) return null;
  const t = referrer.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    const host = u.hostname.trim().toLowerCase();
    return host.slice(0, 255) || null;
  } catch {
    return null;
  }
}
