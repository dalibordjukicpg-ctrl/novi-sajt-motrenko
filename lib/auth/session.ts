import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { authSessions, users } from "@/lib/db/schema";

import {
  SESSION_COOKIE_NAME,
  getSessionMaxAgeSeconds,
  requireEmailVerifiedForLogin,
  isLikelyValidSessionCookieShape,
} from "./constants";
import {
  hashOpaqueToken,
  randomUrlToken,
  timingSafeEqualHex,
} from "./crypto-token";
import { hasPermission, PERMISSIONS } from "./permissions";
import type { SessionUser } from "./types";

function parseSessionCookie(raw: string | undefined): {
  sessionId: string;
  secretHex: string;
} | null {
  if (!isLikelyValidSessionCookieShape(raw) || !raw) return null;
  const dot = raw.indexOf(".");
  const sessionId = raw.slice(0, dot);
  const secretHex = raw.slice(dot + 1);
  return { sessionId, secretHex };
}

async function readRequestMeta(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    const userAgent = h.get("user-agent");
    return {
      ip: ip && ip.length > 0 ? ip.slice(0, 45) : null,
      userAgent: userAgent ? userAgent.slice(0, 512) : null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function createSession(userId: string): Promise<void> {
  const sessionId = randomUUID();
  const secretHex = randomUrlToken();
  const tokenHash = hashOpaqueToken(secretHex);
  if (!tokenHash) throw new Error("session token");

  const { ip, userAgent } = await readRequestMeta();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + getSessionMaxAgeSeconds() * 1000,
  );

  await db.insert(authSessions).values({
    id: sessionId,
    userId,
    tokenHash,
    expiresAt,
    revokedAt: null,
    ipAddress: ip,
    userAgent,
    createdAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, `${sessionId}.${secretHex}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const parsed = parseSessionCookie(raw);
  if (parsed) {
    const expectedHash = hashOpaqueToken(parsed.secretHex);
    if (expectedHash) {
      await db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(authSessions.id, parsed.sessionId),
            eq(authSessions.tokenHash, expectedHash),
            isNull(authSessions.revokedAt),
          ),
        );
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const parsed = parseSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!parsed) return null;

  const expectedHash = hashOpaqueToken(parsed.secretHex);
  if (!expectedHash) return null;

  const now = new Date();

  const [row] = await db
    .select({
      sessionId: authSessions.id,
      userId: authSessions.userId,
      expiresAt: authSessions.expiresAt,
      revokedAt: authSessions.revokedAt,
      tokenHash: authSessions.tokenHash,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.id, parsed.sessionId),
        isNull(authSessions.revokedAt),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt <= now) return null;
  if (!timingSafeEqualHex(row.tokenHash, expectedHash)) return null;
  if (!row.isActive) return null;

  if (
    requireEmailVerifiedForLogin() &&
    row.emailVerifiedAt == null
  ) {
    return null;
  }

  if (!hasPermission(row.role, PERMISSIONS.ADMIN_PANEL_ACCESS)) {
    return null;
  }

  return {
    userId: row.userId,
    email: row.email,
    role: row.role,
    sessionId: row.sessionId,
  };
}

export { SESSION_COOKIE_NAME, isLikelyValidSessionCookieShape } from "./constants";
