import { sendResendEmail } from "./send-resend-email";

export async function sendBookingNotificationEmail(payload: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}): Promise<{ ok: boolean }> {
  const r = await sendResendEmail({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    replyTo: payload.replyTo,
    pdfBuffer: payload.pdfBuffer,
    pdfFilename: payload.pdfFilename,
    logPrefix: "[booking email]",
  });
  return { ok: r.ok };
}
