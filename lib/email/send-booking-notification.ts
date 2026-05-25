import { sendResendEmailWithFallbacks } from "./send-resend-email";

export async function sendBookingNotificationEmail(payload: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}): Promise<{ ok: boolean; skipped?: boolean; resendId?: string }> {
  const r = await sendResendEmailWithFallbacks({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    replyTo: payload.replyTo,
    pdfBuffer: payload.pdfBuffer,
    pdfFilename: payload.pdfFilename,
    logPrefix: "[booking email]",
  });
  if (!r.ok && r.code === "missing_api_key") {
    console.error(
      "[booking email] RESEND_API_KEY nedostaje na serveru — mail nije poslat.",
    );
    return { ok: false, skipped: true };
  }
  return { ok: r.ok, resendId: r.ok ? r.resendId : undefined };
}
