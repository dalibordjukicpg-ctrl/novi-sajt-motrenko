/**
 * Jednostavna slanje e-pošte (Resend HTTP API), bez dodatne zavisnosti.
 * U devu bez API ključa: loguje sadržaj u konzolu.
 */

import { adminPath } from "@/lib/admin-base-path";
import { getSiteUrl } from "@/lib/site-url";

export async function sendAuthEmail(payload: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ?? "Auth <onboarding@resend.dev>";

  if (!key) {
    console.info(
      "[auth email] RESEND_API_KEY nedostaje — poruka nije poslata.",
      {
        to: payload.to,
        subject: payload.subject,
        preview: payload.text.slice(0, 280),
      },
    );
    return { ok: true, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("Resend error", res.status, t);
    return { ok: false };
  }
  return { ok: true };
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
