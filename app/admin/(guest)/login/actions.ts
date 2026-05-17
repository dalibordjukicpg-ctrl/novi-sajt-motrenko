"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSession, verifyPassword, writeAuditLog } from "@/lib/auth";
import { requireEmailVerifiedForLogin } from "@/lib/auth/constants";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type LoginState = { error: string | null };

async function requestAuditMeta(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const ua = h.get("user-agent");
    return {
      ip: ip ? ip.slice(0, 45) : null,
      userAgent: ua ? ua.slice(0, 512) : null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawRedirect = String(formData.get("redirect") ?? "").trim();
  const redirectTo =
    rawRedirect.startsWith("/admin") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/admin";

  if (!email || !password) {
    return { error: "Unesite email i lozinku." };
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { error: "Pogrešan email ili lozinka." };
    }

    if (!user.isActive) {
      return { error: "Nalog je deaktiviran." };
    }

    if (
      requireEmailVerifiedForLogin() &&
      user.emailVerifiedAt == null
    ) {
      return {
        error: "Potvrdite email prije prijave (provjerite poštu).",
      };
    }

    const okPass = verifyPassword(password, user.passwordHash);
    if (!okPass) {
      return { error: "Pogrešan email ili lozinka." };
    }

    await createSession(user.id);

    const meta = await requestAuditMeta();
    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.login",
      subjectType: "user",
      subjectId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));
  } catch (e) {
    console.error(e);
    return {
      error:
        "Prijava nije uspjela (provjeri konfiguraciju servera / baze).",
    };
  }

  redirect(redirectTo);
}
