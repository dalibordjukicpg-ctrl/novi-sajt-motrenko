import { sendAuthEmail } from "./send-auth-email";

export async function sendBookingNotificationEmail(payload: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean }> {
  const r = await sendAuthEmail({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
  return { ok: r.ok };
}
