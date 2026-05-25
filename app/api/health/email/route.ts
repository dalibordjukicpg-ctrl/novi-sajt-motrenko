import {
  DEFAULT_NOTIFY_INBOX,
  resolveNotifyInboxFromEnv,
} from "@/lib/email/resolve-notify-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Provjera Resend env-a na serveru (bez otkrivanja tajni). */
export async function GET() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    email: {
      resendApiKeyConfigured: Boolean(key),
      resendApiKeyPrefix: key ? `${key.slice(0, 6)}…` : null,
      resendFromConfigured: Boolean(from),
      resendFromDomain: from?.match(/@([^>]+)>?$/i)?.[1] ?? null,
      bookingNotifyInbox: resolveNotifyInboxFromEnv("booking"),
      contactNotifyInbox: resolveNotifyInboxFromEnv("contact"),
      defaultInbox: DEFAULT_NOTIFY_INBOX,
    },
  });
}
