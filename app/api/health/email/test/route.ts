import { sendResendEmail } from "@/lib/email/send-resend-email";
import { resolveNotifyInboxFromEnv } from "@/lib/email/resolve-notify-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST test slanja (za dijagnostiku na Hostingeru).
 * Header: Authorization: Bearer <HEALTH_EMAIL_SECRET>
 * ili body: { "secret": "..." }
 */
export async function POST(req: Request) {
  const expected = process.env.HEALTH_EMAIL_SECRET?.trim();
  if (!expected) {
    return Response.json(
      { ok: false, error: "HEALTH_EMAIL_SECRET nije podešen na serveru." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization")?.trim();
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  let bodySecret = "";
  try {
    const json = (await req.json()) as { secret?: string };
    bodySecret = json.secret?.trim() ?? "";
  } catch {
    /* ignore */
  }

  if (bearer !== expected && bodySecret !== expected) {
    return Response.json({ ok: false, error: "Neispravan secret." }, { status: 401 });
  }

  const to = resolveNotifyInboxFromEnv("booking");
  const sent = await sendResendEmail({
    to,
    subject: `[TEST] Resend sa humanreproduction.com`,
    text: `Test poruka sa servera.\nVrijeme: ${new Date().toISOString()}\nPrimalac: ${to}`,
    logPrefix: "[health email test]",
  });

  if (sent.ok && sent.skipped) {
    return Response.json(
      { ok: false, error: "RESEND_API_KEY nedostaje na serveru.", to },
      { status: 502 },
    );
  }

  if (!sent.ok) {
    return Response.json(
      {
        ok: false,
        error: "Resend odbio slanje.",
        to,
        code: sent.code,
        status: sent.code === "resend_http" ? sent.status : undefined,
        detail: sent.code === "resend_http" ? sent.bodySnippet : undefined,
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    to,
    resendId: sent.resendId ?? null,
  });
}
