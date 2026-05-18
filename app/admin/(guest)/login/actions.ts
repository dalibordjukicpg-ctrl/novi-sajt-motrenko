"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_BASE_PATH } from "@/lib/admin-base-path";
import { createSession, verifyPassword, writeAuditLog } from "@/lib/auth";
import { requireEmailVerifiedForLogin } from "@/lib/auth/constants";
import {
  clearLoginRateLimit,
  getLoginRateLimitState,
  registerLoginFailure,
} from "@/lib/auth/login-rate-limit";
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

function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.ceil(seconds / 60);
  return `${m} min`;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawRedirect = String(formData.get("redirect") ?? "").trim();
  /*
   * Sigurnost redirekta:
   *   - mora počinjati novom admin bazom (`/hrc-panel-74x/...`)
   *   - ne smije biti protocol-relative (`//host...`)
   */
  const redirectTo =
    rawRedirect.startsWith(`${ADMIN_BASE_PATH}/`) && !rawRedirect.startsWith("//")
      ? rawRedirect
      : ADMIN_BASE_PATH;

  if (!email || !password) {
    return { error: "Unesite email i lozinku." };
  }

  const meta = await requestAuditMeta();

  // Rate limit — provjeri prije ikakvog DB lookupa.
  const rl = getLoginRateLimitState(meta.ip, email);
  if (rl.blocked) {
    return {
      error: `Previše neuspjelih pokušaja. Pokušajte ponovo za ${formatRetryAfter(rl.retryAfterSec)}.`,
    };
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      const state = registerLoginFailure(meta.ip, email);
      return {
        error: state.blocked
          ? `Previše neuspjelih pokušaja. Pokušajte ponovo za ${formatRetryAfter(state.retryAfterSec)}.`
          : "Pogrešan email ili lozinka.",
      };
    }

    if (!user.isActive) {
      registerLoginFailure(meta.ip, email);
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
      const state = registerLoginFailure(meta.ip, email);
      // Audit pogrešne lozinke (pomaže pri istrazi pokušaja proboja)
      try {
        await writeAuditLog({
          actorUserId: user.id,
          action: "auth.login_failed",
          subjectType: "user",
          subjectId: user.id,
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        });
      } catch {
        /* audit ne smije srušiti login flow */
      }
      return {
        error: state.blocked
          ? `Previše neuspjelih pokušaja. Pokušajte ponovo za ${formatRetryAfter(state.retryAfterSec)}.`
          : "Pogrešan email ili lozinka.",
      };
    }

    await createSession(user.id);
    clearLoginRateLimit(meta.ip, email);

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
