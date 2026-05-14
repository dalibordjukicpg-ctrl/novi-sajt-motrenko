import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  getSessionMaxAgeSeconds,
  signSessionToken,
  verifySessionToken,
} from "./auth-token";

/**
 * Creates a signed httpOnly session cookie (JWT, HS256).
 * Call from Server Actions or Route Handlers after verifying credentials.
 */
export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { SESSION_COOKIE_NAME, verifySessionToken } from "./auth-token";
