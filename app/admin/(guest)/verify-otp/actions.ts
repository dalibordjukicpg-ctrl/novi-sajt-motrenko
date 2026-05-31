"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_BASE_PATH, adminPath } from "@/lib/admin-base-path";
import { createSession, writeAuditLog } from "@/lib/auth";
import {
  canSendOtpEmail,
  clearOtpPendingCookie,
  countRecentOtpSends,
  generateOtpCode,
  getActiveOtpChallenge,
  recordOtpSend,
  refreshOtpOnChallenge,
  verifyOtpCode,
} from "@/lib/auth/otp-challenge";
import { createTrustedDevice } from "@/lib/auth/trusted-device";
import { getOtpMaxSends, getOtpSendWindowMs } from "@/lib/auth/constants";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginOtpEmailBody, sendAuthEmail } from "@/lib/email/send-auth-email";

export type VerifyOtpState = {
  error: string | null;
  info: string | null;
};

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

function sanitizeRedirect(raw: string): string {
  const trimmed = raw.trim();
  if (
    trimmed.startsWith(`${ADMIN_BASE_PATH}/`) &&
    !trimmed.startsWith("//")
  ) {
    return trimmed;
  }
  return ADMIN_BASE_PATH;
}

export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const code = String(formData.get("code") ?? "").trim();
  const rememberDevice = formData.get("rememberDevice") === "on";
  const meta = await requestAuditMeta();

  if (!/^\d{6}$/.test(code)) {
    return { error: "Unesite 6-cifreni kod.", info: null };
  }

  const active = await getActiveOtpChallenge();
  if (!active.ok) {
    if (active.reason === "locked") {
      return {
        error: `Previše pogrešnih pokušaja. Pokušajte ponovo za ${formatRetryAfter(active.retryAfterSec ?? 0)}.`,
        info: null,
      };
    }
    if (active.reason === "expired") {
      return {
        error: "Kod je istekao. Zatražite novi kod.",
        info: null,
      };
    }
    redirect(adminPath("login"));
  }

  const result = await verifyOtpCode(code);
  if (!result.ok) {
    if (result.reason === "locked") {
      try {
        await writeAuditLog({
          actorUserId: active.challenge.userId,
          action: "auth.otp_locked",
          subjectType: "user",
          subjectId: active.challenge.userId,
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        });
      } catch {
        /* ignore */
      }
      return {
        error: `Previše pogrešnih pokušaja. Pokušajte ponovo za ${formatRetryAfter(result.retryAfterSec ?? 0)}.`,
        info: null,
      };
    }

    try {
      await writeAuditLog({
        actorUserId: active.challenge.userId,
        action: "auth.otp_failed",
        subjectType: "user",
        subjectId: active.challenge.userId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
    } catch {
      /* ignore */
    }

    if (result.reason === "expired") {
      return { error: "Kod je istekao. Zatražite novi kod.", info: null };
    }

    return { error: "Pogrešan kod. Pokušajte ponovo.", info: null };
  }

  const redirectTo = sanitizeRedirect(result.challenge.redirectTo);

  await clearOtpPendingCookie();
  await createSession(result.challenge.userId);

  if (rememberDevice) {
    try {
      await createTrustedDevice(result.challenge.userId);
    } catch (e) {
      console.error("trusted device failed", e);
    }
  }

  await writeAuditLog({
    actorUserId: result.challenge.userId,
    action: "auth.login",
    subjectType: "user",
    subjectId: result.challenge.userId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    metadata: { via: "otp" },
  });

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, result.challenge.userId));

  redirect(redirectTo);
}

export async function resendOtpAction(): Promise<VerifyOtpState> {
  const meta = await requestAuditMeta();
  const active = await getActiveOtpChallenge();

  if (!active.ok) {
    if (active.reason === "locked") {
      return {
        error: `Verifikacija je privremeno zaključana. Pokušajte za ${formatRetryAfter(active.retryAfterSec ?? 0)}.`,
        info: null,
      };
    }
    redirect(adminPath("login"));
  }

  const canSend = await canSendOtpEmail(active.challenge.userId);
  if (!canSend) {
    const sent = await countRecentOtpSends(active.challenge.userId);
    const windowMin = Math.ceil(getOtpSendWindowMs() / 60_000);
    return {
      error: `Dostignut je limit slanja (${getOtpMaxSends()} puta u ${windowMin} min). Pokušajte kasnije.`,
      info: null,
    };
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, active.challenge.userId))
    .limit(1);

  if (!user) {
    redirect(adminPath("login"));
  }

  const otpCode = generateOtpCode();
  await refreshOtpOnChallenge(active.challenge.challengeId, otpCode);
  await recordOtpSend(active.challenge.userId);

  const body = loginOtpEmailBody({ code: otpCode });
  const sent = await sendAuthEmail({
    to: user.email,
    subject: body.subject,
    text: body.text,
  });

  if (!sent.ok && !sent.skipped) {
    return {
      error: "Slanje koda nije uspjelo. Pokušajte ponovo.",
      info: null,
    };
  }

  return {
    error: null,
    info: sent.skipped
      ? "Kod je generisan (email servis nije konfigurisan u dev okruženju)."
      : "Novi kod je poslan na vašu email adresu.",
  };
}

export async function resendOtpFormAction(
  _prev: VerifyOtpState,
  _formData: FormData,
): Promise<VerifyOtpState> {
  return resendOtpAction();
}

export async function cancelOtpAction(): Promise<void> {
  await clearOtpPendingCookie();
  redirect(adminPath("login"));
}
