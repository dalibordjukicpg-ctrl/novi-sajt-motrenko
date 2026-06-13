import {
  DEFAULT_NOTIFY_INBOX,
  resolveNotifyInboxFromEnv,
} from "@/lib/email/resolve-notify-inbox";
import { getResendEnvStatus } from "@/lib/email/resend-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Provjera Resend env-a na serveru (bez otkrivanja tajni). */
export async function GET() {
  const resend = getResendEnvStatus();

  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    email: {
      resendApiKeyConfigured: resend.apiKeyConfigured,
      resendApiKeyPrefix: resend.apiKeyPrefix,
      resendFromConfigured: resend.fromConfigured,
      resendFromDomain: resend.fromDomain,
      bookingNotifyInbox: resolveNotifyInboxFromEnv("booking"),
      contactNotifyInbox: resolveNotifyInboxFromEnv("contact"),
      defaultInbox: DEFAULT_NOTIFY_INBOX,
    },
  });
}
