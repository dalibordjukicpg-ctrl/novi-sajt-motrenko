import { adminPath } from "@/lib/admin-base-path";
import { getSiteUrl } from "@/lib/site-url";

import { sendResendEmail } from "./send-resend-email";

export async function sendAuthEmail(payload: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const r = await sendResendEmail({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    logPrefix: "[auth email]",
  });
  if (r.ok) return { ok: true };
  if (r.code === "missing_api_key") return { ok: true, skipped: true };
  return { ok: false };
}

export function loginOtpEmailBody(opts: { code: string }): {
  subject: string;
  text: string;
} {
  return {
    subject: "Kod za prijavu u admin panel",
    text: `Vaš kod za prijavu je: ${opts.code}\n\nKod važi 10 minuta. Ako niste vi pokušali prijavu, ignorisati ovu poruku.`,
  };
}

export function resetPasswordEmailBody(opts: {
  token: string;
}): { subject: string; text: string } {
  const origin = getSiteUrl();
  const link = `${origin}${adminPath("/reset-password")}?token=${encodeURIComponent(opts.token)}`;
  return {
    subject: "Reset lozinke",
    text: `Zatražili ste reset lozinke. Otvorite link (važi ograničeno vrijeme):\n\n${link}\n\nAko niste vi, ignorisati.`,
  };
}

export function verifyEmailBody(opts: { token: string }): {
  subject: string;
  text: string;
} {
  const origin = getSiteUrl();
  const link = `${origin}${adminPath("/verify-email")}?token=${encodeURIComponent(opts.token)}`;
  return {
    subject: "Potvrdite email adresu",
    text: `Potvrdite adresu otvaranjem linka:\n\n${link}\n`,
  };
}
