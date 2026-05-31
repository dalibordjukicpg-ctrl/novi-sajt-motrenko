/** httpOnly cookie — vrijednost: `{sessionId}.{64-hex secret}` */
export const SESSION_COOKIE_NAME = "session";

/** Pending OTP verification after password login — `{challengeId}.{64-hex secret}` */
export const OTP_PENDING_COOKIE_NAME = "admin_otp_pending";

/** Remember trusted device for 30 days — `{deviceId}.{64-hex secret}` */
export const TRUSTED_DEVICE_COOKIE_NAME = "admin_trusted_device";

const SESSION_COOKIE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;

export function isLikelyValidSessionCookieShape(
  value: string | undefined,
): boolean {
  if (!value) return false;
  return SESSION_COOKIE_RE.test(value);
}

export function isLikelyValidOtpPendingCookieShape(
  value: string | undefined,
): boolean {
  return isLikelyValidSessionCookieShape(value);
}

export function isLikelyValidTrustedDeviceCookieShape(
  value: string | undefined,
): boolean {
  return isLikelyValidSessionCookieShape(value);
}

/** OTP expires after 10 minutes. */
export function getOtpExpiryMs(): number {
  const raw = process.env.ADMIN_OTP_EXPIRY_MS;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 60_000 && n <= 60 * 60 * 1000) return n;
  }
  return 10 * 60 * 1000;
}

/** Max OTP emails per user within the send window (default 3). */
export function getOtpMaxSends(): number {
  const raw = process.env.ADMIN_OTP_MAX_SENDS;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 10) return n;
  }
  return 3;
}

/** OTP send rate window in ms (default 15 min). */
export function getOtpSendWindowMs(): number {
  const raw = process.env.ADMIN_OTP_SEND_WINDOW_MS;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 60_000) return n;
  }
  return 15 * 60 * 1000;
}

/** Max wrong OTP attempts before lock (default 5). */
export function getOtpMaxWrongAttempts(): number {
  const raw = process.env.ADMIN_OTP_MAX_WRONG_ATTEMPTS;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
  }
  return 5;
}

/** OTP verification lock duration in ms (default 15 min). */
export function getOtpLockMs(): number {
  const raw = process.env.ADMIN_OTP_LOCK_MS;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 60_000) return n;
  }
  return 15 * 60 * 1000;
}

/** Trusted device cookie max age (default 30 days). */
export function getTrustedDeviceMaxAgeSeconds(): number {
  const raw = process.env.ADMIN_TRUSTED_DEVICE_MAX_AGE_SEC;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 86400 && n <= 60 * 60 * 24 * 90) return n;
  }
  return 60 * 60 * 24 * 30;
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
