/**
 * Resend slanje e-pošte sa opcionalnim PDF prilogom.
 */

export type SendResendEmailResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; code: "missing_api_key" }
  | { ok: false; code: "resend_http"; status: number; bodySnippet: string };

export async function sendResendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
  logPrefix?: string;
}): Promise<SendResendEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ?? "Auth <onboarding@resend.dev>";
  const prefix = opts.logPrefix ?? "[email]";

  if (!key) {
    console.info(`${prefix} RESEND_API_KEY nedostaje — poruka nije poslata.`, {
      to: opts.to,
      subject: opts.subject,
      preview: opts.text.slice(0, 280),
    });
    return { ok: true, skipped: true };
  }

  const body: Record<string, unknown> = {
    from,
    to: [opts.to],
    subject: opts.subject,
    text: opts.text,
  };

  if (opts.replyTo?.includes("@")) {
    body.reply_to = opts.replyTo;
  }
  if (opts.html) {
    body.html = opts.html;
  }
  if (opts.pdfBuffer && opts.pdfFilename) {
    body.attachments = [
      {
        filename: opts.pdfFilename,
        content: opts.pdfBuffer.toString("base64"),
      },
    ];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error(`${prefix} Resend error`, res.status, t);
    return {
      ok: false,
      code: "resend_http",
      status: res.status,
      bodySnippet: t.slice(0, 400),
    };
  }

  return { ok: true };
}
