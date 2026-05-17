/** httpOnly cookie — vrijednost: `{sessionId}.{64-hex secret}` */
export const SESSION_COOKIE_NAME = "session";

const SESSION_COOKIE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;

export function isLikelyValidSessionCookieShape(
  value: string | undefined,
): boolean {
  if (!value) return false;
  return SESSION_COOKIE_RE.test(value);
}

/** Podrazumijevani super-admin (može se promijeniti putem env `SUPER_ADMIN_EMAIL`). */
export const DEFAULT_SUPER_ADMIN_EMAIL = "dalibor.djukic.pg@gmail.com";

export function getSessionMaxAgeSeconds(): number {
  const raw = process.env.AUTH_SESSION_MAX_AGE_SEC;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 60 && n <= 60 * 60 * 24 * 400) {
      return n;
    }
  }
  return 60 * 60 * 24 * 30;
}

export function requireEmailVerifiedForLogin(): boolean {
  return process.env.AUTH_REQUIRE_EMAIL_VERIFIED === "1";
}

export function getAuthCookieValueMaxLength(): number {
  return 36 + 1 + 64;
}
