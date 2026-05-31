import { randomInt, randomUUID } from "crypto";

import { cookies, headers } from "next/headers";
import { and, count, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  adminLoginOtpChallenges,
  adminLoginOtpSends,
} from "@/lib/db/schema";

import {
  getOtpExpiryMs,
  getOtpLockMs,
  getOtpMaxSends,
  getOtpMaxWrongAttempts,
  getOtpSendWindowMs,
  isLikelyValidOtpPendingCookieShape,
  OTP_PENDING_COOKIE_NAME,
} from "./constants";
import {
  hashOpaqueToken,
  randomUrlToken,
  sha256Hex,
  timingSafeEqualHex,
} from "./crypto-token";

export type OtpChallengeRow = {
  challengeId: string;
  userId: string;
  redirectTo: string;
  otpExpiresAt: Date;
  wrongAttempts: number;
  lockedUntil: Date | null;
  consumedAt: Date | null;
};

function parsePendingCookie(raw: string | undefined): {
  challengeId: string;
  secretHex: string;
} | null {
  if (!isLikelyValidOtpPendingCookieShape(raw) || !raw) return null;
  const dot = raw.indexOf(".");
  return {
    challengeId: raw.slice(0, dot),
    secretHex: raw.slice(dot + 1),
  };
}

export function hashOtpCode(challengeId: string, code: string): string {
  const normalized = code.replace(/\D/g, "").padStart(6, "0").slice(-6);
  return sha256Hex(`${challengeId}:${normalized}`);
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function readRequestMeta(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const userAgent = h.get("user-agent");
    return {
      ip: ip && ip.length > 0 ? ip.slice(0, 45) : null,
      userAgent: userAgent ? userAgent.slice(0, 512) : null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function countRecentOtpSends(userId: string): Promise<number> {
  const since = new Date(Date.now() - getOtpSendWindowMs());
  const [row] = await db
    .select({ total: count() })
    .from(adminLoginOtpSends)
    .where(
      and(
        eq(adminLoginOtpSends.userId, userId),
        gt(adminLoginOtpSends.createdAt, since),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function canSendOtpEmail(userId: string): Promise<boolean> {
  const sent = await countRecentOtpSends(userId);
  return sent < getOtpMaxSends();
}

export async function recordOtpSend(userId: string): Promise<void> {
  await db.insert(adminLoginOtpSends).values({
    id: randomUUID(),
    userId,
    createdAt: new Date(),
  });
}

/** Invalidate unconsumed challenges for user before creating a new one. */
async function revokeOpenChallenges(userId: string): Promise<void> {
  const now = new Date();
  await db
    .update(adminLoginOtpChallenges)
    .set({ consumedAt: now })
    .where(
      and(
        eq(adminLoginOtpChallenges.userId, userId),
        isNull(adminLoginOtpChallenges.consumedAt),
      ),
    );
}

export async function createOtpChallenge(opts: {
  userId: string;
  redirectTo: string;
  otpCode: string;
}): Promise<{ challengeId: string; secretHex: string }> {
  const challengeId = randomUUID();
  const secretHex = randomUrlToken();
  const secretHash = hashOpaqueToken(secretHex);
  if (!secretHash) throw new Error("otp challenge secret");

  const otpHash = hashOtpCode(challengeId, opts.otpCode);
  const now = new Date();
  const otpExpiresAt = new Date(now.getTime() + getOtpExpiryMs());
  const { ip, userAgent } = await readRequestMeta();

  await revokeOpenChallenges(opts.userId);

  await db.insert(adminLoginOtpChallenges).values({
    id: challengeId,
    userId: opts.userId,
    secretHash,
    otpHash,
    otpExpiresAt,
    wrongAttempts: 0,
    lockedUntil: null,
    redirectTo: opts.redirectTo.slice(0, 512),
    consumedAt: null,
    ipAddress: ip,
    userAgent,
    createdAt: now,
  });

  return { challengeId, secretHex };
}

export async function setOtpPendingCookie(
  challengeId: string,
  secretHex: string,
): Promise<void> {
  const cookieStore = await cookies();
  const maxAgeSec = Math.ceil(getOtpExpiryMs() / 1000) + 60 * 15;
  cookieStore.set(OTP_PENDING_COOKIE_NAME, `${challengeId}.${secretHex}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export async function clearOtpPendingCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OTP_PENDING_COOKIE_NAME);
}

async function loadChallengeByCookie(): Promise<
  (OtpChallengeRow & { secretHash: string; otpHash: string }) | null
> {
  const cookieStore = await cookies();
  const parsed = parsePendingCookie(
    cookieStore.get(OTP_PENDING_COOKIE_NAME)?.value,
  );
  if (!parsed) return null;

  const expectedSecretHash = hashOpaqueToken(parsed.secretHex);
  if (!expectedSecretHash) return null;

  const [row] = await db
    .select({
      challengeId: adminLoginOtpChallenges.id,
      userId: adminLoginOtpChallenges.userId,
      secretHash: adminLoginOtpChallenges.secretHash,
      otpHash: adminLoginOtpChallenges.otpHash,
      otpExpiresAt: adminLoginOtpChallenges.otpExpiresAt,
      wrongAttempts: adminLoginOtpChallenges.wrongAttempts,
      lockedUntil: adminLoginOtpChallenges.lockedUntil,
      consumedAt: adminLoginOtpChallenges.consumedAt,
      redirectTo: adminLoginOtpChallenges.redirectTo,
    })
    .from(adminLoginOtpChallenges)
    .where(eq(adminLoginOtpChallenges.id, parsed.challengeId))
    .limit(1);

  if (!row) return null;
  if (!timingSafeEqualHex(row.secretHash, expectedSecretHash)) return null;

  return row;
}

export type OtpVerificationState =
  | { ok: true; challenge: OtpChallengeRow }
  | {
      ok: false;
      reason:
        | "missing"
        | "consumed"
        | "locked"
        | "expired";
      retryAfterSec?: number;
    };

export async function getActiveOtpChallenge(): Promise<OtpVerificationState> {
  const row = await loadChallengeByCookie();
  if (!row) return { ok: false, reason: "missing" };
  if (row.consumedAt) return { ok: false, reason: "consumed" };

  const now = new Date();
  if (row.lockedUntil && row.lockedUntil > now) {
    return {
      ok: false,
      reason: "locked",
      retryAfterSec: Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 1000),
    };
  }
  if (row.otpExpiresAt <= now) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    challenge: {
      challengeId: row.challengeId,
      userId: row.userId,
      redirectTo: row.redirectTo,
      otpExpiresAt: row.otpExpiresAt,
      wrongAttempts: row.wrongAttempts,
      lockedUntil: row.lockedUntil,
      consumedAt: row.consumedAt,
    },
  };
}

export async function verifyOtpCode(code: string): Promise<
  | { ok: true; challenge: OtpChallengeRow }
  | {
      ok: false;
      reason: "missing" | "consumed" | "locked" | "expired" | "invalid";
      retryAfterSec?: number;
      locked?: boolean;
    }
> {
  const row = await loadChallengeByCookie();
  if (!row) return { ok: false, reason: "missing" };
  if (row.consumedAt) return { ok: false, reason: "consumed" };

  const now = new Date();
  if (row.lockedUntil && row.lockedUntil > now) {
    return {
      ok: false,
      reason: "locked",
      retryAfterSec: Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 1000),
    };
  }
  if (row.otpExpiresAt <= now) {
    return { ok: false, reason: "expired" };
  }

  const expected = hashOtpCode(row.challengeId, code);
  if (!timingSafeEqualHex(row.otpHash, expected)) {
    const wrongAttempts = row.wrongAttempts + 1;
    const locked = wrongAttempts >= getOtpMaxWrongAttempts();
    const lockedUntil = locked
      ? new Date(now.getTime() + getOtpLockMs())
      : null;

    await db
      .update(adminLoginOtpChallenges)
      .set({
        wrongAttempts,
        lockedUntil,
      })
      .where(eq(adminLoginOtpChallenges.id, row.challengeId));

    return {
      ok: false,
      reason: "invalid",
      locked,
      retryAfterSec: locked
        ? Math.ceil(getOtpLockMs() / 1000)
        : undefined,
    };
  }

  await db
    .update(adminLoginOtpChallenges)
    .set({ consumedAt: now })
    .where(eq(adminLoginOtpChallenges.id, row.challengeId));

  return {
    ok: true,
    challenge: {
      challengeId: row.challengeId,
      userId: row.userId,
      redirectTo: row.redirectTo,
      otpExpiresAt: row.otpExpiresAt,
      wrongAttempts: row.wrongAttempts,
      lockedUntil: row.lockedUntil,
      consumedAt: now,
    },
  };
}

export async function refreshOtpOnChallenge(
  challengeId: string,
  otpCode: string,
): Promise<void> {
  const otpHash = hashOtpCode(challengeId, otpCode);
  const otpExpiresAt = new Date(Date.now() + getOtpExpiryMs());
  await db
    .update(adminLoginOtpChallenges)
    .set({
      otpHash,
      otpExpiresAt,
      wrongAttempts: 0,
      lockedUntil: null,
    })
    .where(
      and(
        eq(adminLoginOtpChallenges.id, challengeId),
        isNull(adminLoginOtpChallenges.consumedAt),
      ),
    );
}

export { OTP_PENDING_COOKIE_NAME, isLikelyValidOtpPendingCookieShape };
