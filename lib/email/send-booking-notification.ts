import { sendAuthEmail } from "./send-auth-email";
import { sendResendEmail } from "./send-resend-email";

export async function sendBookingNotificationEmail(payload: {
  to: string;
  subject: string;
  text: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}): Promise<{ ok: boolean }> {
  if (payload.pdfBuffer && payload.pdfFilename && payload.pdfBuffer.length > 0) {
    const withPdf = await sendResendEmail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      pdfBuffer: payload.pdfBuffer,
      pdfFilename: payload.pdfFilename,
      logPrefix: "[booking email:pdf]",
    });
    if (withPdf.ok) return { ok: true };
    console.warn("[booking email] PDF send failed, falling back to plain text");
  }

  const plain = await sendAuthEmail({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
  return { ok: plain.ok && !plain.skipped };
}
