/**
 * Resend slanje e-pošte sa opcionalnim PDF prilogom.
 */

export type SendResendEmailResult =
  | { ok: true; skipped?: boolean; resendId?: string }
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
    console.error(`${prefix} RESEND_API_KEY nedostaje — poruka nije poslata.`, {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, code: "missing_api_key" };
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
  if (opts.pdfBuffer && opts.pdfFilename && opts.pdfBuffer.length > 0) {
    body.attachments = [
      {
        filename: opts.pdfFilename,
        content: opts.pdfBuffer.toString("base64"),
      },
    ];
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${prefix} Resend fetch failed`, msg);
    return {
      ok: false,
      code: "resend_http",
      status: 0,
      bodySnippet: msg.slice(0, 400),
    };
  }

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

  let resendId: string | undefined;
  try {
    const json = (await res.json()) as { id?: string };
    resendId = json.id;
    console.info(`${prefix} sent`, { to: opts.to, resendId });
  } catch {
    /* ignore */
  }

  return { ok: true, resendId };
}

/** Više pokušaja: PDF+reply → PDF → tekst+reply → tekst. */
export async function sendResendEmailWithFallbacks(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
  logPrefix?: string;
}): Promise<SendResendEmailResult> {
  const prefix = opts.logPrefix ?? "[email]";
  const hasPdf =
    Boolean(opts.pdfBuffer && opts.pdfFilename && opts.pdfBuffer.length > 0);

  const attempts: Array<{
    label: string;
    replyTo?: string;
    pdfBuffer?: Buffer;
    pdfFilename?: string;
  }> = [];

  if (hasPdf) {
    attempts.push({
      label: "pdf+reply",
      replyTo: opts.replyTo,
      pdfBuffer: opts.pdfBuffer,
      pdfFilename: opts.pdfFilename,
    });
    attempts.push({
      label: "pdf",
      pdfBuffer: opts.pdfBuffer,
      pdfFilename: opts.pdfFilename,
    });
  }

  attempts.push({ label: "text+reply", replyTo: opts.replyTo });
  attempts.push({ label: "text" });

  let last: SendResendEmailResult = {
    ok: false,
    code: "resend_http",
    status: 0,
    bodySnippet: "no attempts",
  };

  for (const attempt of attempts) {
    const r = await sendResendEmail({
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      replyTo: attempt.replyTo,
      pdfBuffer: attempt.pdfBuffer,
      pdfFilename: attempt.pdfFilename,
      logPrefix: `${prefix}:${attempt.label}`,
    });
    if (r.ok) return r;
    last = r;
    console.warn(`${prefix} attempt failed`, attempt.label, r);
  }

  return last;
}
