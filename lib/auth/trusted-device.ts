import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { adminTrustedDevices } from "@/lib/db/schema";

import {
  getTrustedDeviceMaxAgeSeconds,
  isLikelyValidTrustedDeviceCookieShape,
  TRUSTED_DEVICE_COOKIE_NAME,
} from "./constants";
import {
  hashOpaqueToken,
  randomUrlToken,
  timingSafeEqualHex,
} from "./crypto-token";

function parseTrustedDeviceCookie(raw: string | undefined): {
  deviceId: string;
  secretHex: string;
} | null {
  if (!isLikelyValidTrustedDeviceCookieShape(raw) || !raw) return null;
  const dot = raw.indexOf(".");
  return {
    deviceId: raw.slice(0, dot),
    secretHex: raw.slice(dot + 1),
  };
}

export async function isTrustedDeviceForUser(
  userId: string,
): Promise<boolean> {
  const cookieStore = await cookies();
  const parsed = parseTrustedDeviceCookie(
    cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value,
  );
  if (!parsed) return false;

  const expectedHash = hashOpaqueToken(parsed.secretHex);
  if (!expectedHash) return false;

  const now = new Date();
  const [row] = await db
    .select({
      userId: adminTrustedDevices.userId,
      tokenHash: adminTrustedDevices.tokenHash,
      expiresAt: adminTrustedDevices.expiresAt,
      revokedAt: adminTrustedDevices.revokedAt,
    })
    .from(adminTrustedDevices)
    .where(
      and(
        eq(adminTrustedDevices.id, parsed.deviceId),
        eq(adminTrustedDevices.userId, userId),
        isNull(adminTrustedDevices.revokedAt),
      ),
    )
    .limit(1);

  if (!row) return false;
  if (row.expiresAt <= now) return false;
  if (!timingSafeEqualHex(row.tokenHash, expectedHash)) return false;

  await db
    .update(adminTrustedDevices)
    .set({ lastUsedAt: now })
    .where(eq(adminTrustedDevices.id, parsed.deviceId));

  return true;
}

export async function createTrustedDevice(userId: string): Promise<void> {
  const deviceId = randomUUID();
  const secretHex = randomUrlToken();
  const tokenHash = hashOpaqueToken(secretHex);
  if (!tokenHash) throw new Error("trusted device token");

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + getTrustedDeviceMaxAgeSeconds() * 1000,
  );

  await db.insert(adminTrustedDevices).values({
    id: deviceId,
    userId,
    tokenHash,
    expiresAt,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    lastUsedAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set(TRUSTED_DEVICE_COOKIE_NAME, `${deviceId}.${secretHex}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getTrustedDeviceMaxAgeSeconds(),
  });
}

export {
  TRUSTED_DEVICE_COOKIE_NAME,
  isLikelyValidTrustedDeviceCookieShape,
};
