"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_BASE_PATH, adminPath } from "@/lib/admin-base-path";
import { createSession, verifyPassword, writeAuditLog } from "@/lib/auth";
import { requireEmailVerifiedForLogin } from "@/lib/auth/constants";
import {
  clearLoginRateLimit,
  getLoginRateLimitState,
  registerLoginFailure,
} from "@/lib/auth/login-rate-limit";
import {
  canSendOtpEmail,
  createOtpChallenge,
  generateOtpCode,
  recordOtpSend,
  setOtpPendingCookie,
} from "@/lib/auth/otp-challenge";
import { isTrustedDeviceForUser } from "@/lib/auth/trusted-device";
import { canAccessAdminPanel } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginOtpEmailBody, sendAuthEmail } from "@/lib/email/send-auth-email";

export type LoginState = { error: string | null };

const GENERIC_LOGIN_ERROR = "Pogrešan email ili lozinka.";

function isMissingOtpSchemaError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = String((e as { sqlMessage?: string; message?: string })?.sqlMessage ?? (e as Error)?.message ?? "");
  if (code === "ER_NO_SUCH_TABLE") {
    return /admin_login_otp|admin_trusted_devices/i.test(msg);
  }
  return false;
}

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

async function logLoginFailed(opts: {
  actorUserId: string | null;
  ip: string | null;
  userAgent: string | null;
  reason?: string;
}): Promise<void> {
  try {
    await writeAuditLog({
      actorUserId: opts.actorUserId,
      action: "auth.login_failed",
      subjectType: opts.actorUserId ? "user" : null,
      subjectId: opts.actorUserId,
      metadata: opts.reason ? { reason: opts.reason } : null,
      ipAddress: opts.ip,
      userAgent: opts.userAgent,
    });
  } catch {
    /* audit ne smije srušiti login flow */
  }
}

async function finishTrustedDeviceLogin(opts: {
  userId: string;
  redirectTo: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  await createSession(opts.userId);

  await writeAuditLog({
    actorUserId: opts.userId,
    action: "auth.login",
    subjectType: "user",
    subjectId: opts.userId,
    ipAddress: opts.ip,
    userAgent: opts.userAgent,
    metadata: { via: "trusted_device" },
  });

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, opts.userId));

  redirect(opts.redirectTo);
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawRedirect = String(formData.get("redirect") ?? "").trim();
  const redirectTo =
    rawRedirect.startsWith(`${ADMIN_BASE_PATH}/`) && !rawRedirect.startsWith("//")
      ? rawRedirect
      : ADMIN_BASE_PATH;

  if (!email || !password) {
    return { error: "Unesite email i lozinku." };
  }

  const meta = await requestAuditMeta();

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
      registerLoginFailure(meta.ip, email);
      await logLoginFailed({
        actorUserId: null,
        ip: meta.ip,
        userAgent: meta.userAgent,
        reason: "invalid_credentials",
      });
      return { error: GENERIC_LOGIN_ERROR };
    }

    if (!user.isActive || !canAccessAdminPanel(user.role)) {
      registerLoginFailure(meta.ip, email);
      await logLoginFailed({
        actorUserId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        reason: "invalid_credentials",
      });
      return { error: GENERIC_LOGIN_ERROR };
    }

    if (requireEmailVerifiedForLogin() && user.emailVerifiedAt == null) {
      registerLoginFailure(meta.ip, email);
      await logLoginFailed({
        actorUserId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        reason: "invalid_credentials",
      });
      return { error: GENERIC_LOGIN_ERROR };
    }

    const okPass = verifyPassword(password, user.passwordHash);
    if (!okPass) {
      const state = registerLoginFailure(meta.ip, email);
      await logLoginFailed({
        actorUserId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        reason: "invalid_credentials",
      });
      return {
        error: state.blocked
          ? `Previše neuspjelih pokušaja. Pokušajte ponovo za ${formatRetryAfter(state.retryAfterSec)}.`
          : GENERIC_LOGIN_ERROR,
      };
    }

    clearLoginRateLimit(meta.ip, email);

    if (await isTrustedDeviceForUser(user.id)) {
      await finishTrustedDeviceLogin({
        userId: user.id,
        redirectTo,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    if (!(await canSendOtpEmail(user.id))) {
      return {
        error:
          "Privremeno nije moguće poslati verifikacioni kod. Pokušajte kasnije.",
      };
    }

    const otpCode = generateOtpCode();
    const { challengeId, secretHex } = await createOtpChallenge({
      userId: user.id,
      redirectTo,
      otpCode,
    });

    await recordOtpSend(user.id);
    await setOtpPendingCookie(challengeId, secretHex);

    const body = loginOtpEmailBody({ code: otpCode });
    const sent = await sendAuthEmail({
      to: user.email,
      subject: body.subject,
      text: body.text,
    });

    if (!sent.ok && !sent.skipped) {
      return {
        error: "Slanje verifikacionog koda nije uspjelo. Pokušajte ponovo.",
      };
    }

    if (sent.skipped) {
      console.info("[auth otp] dev skip — code:", otpCode);
    }
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    if (isMissingOtpSchemaError(e)) {
      return {
        error:
          "Admin OTP tabele nisu u bazi. U phpMyAdmin pokrenite SQL iz drizzle/0021_admin_login_otp.sql, pa pokušajte ponovo.",
      };
    }
    return {
      error:
        "Prijava nije uspjela (provjeri konfiguraciju servera / baze).",
    };
  }

  redirect(adminPath("verify-otp"));
}
