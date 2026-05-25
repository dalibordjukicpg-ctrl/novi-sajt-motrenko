/**
 * Slanje kontakt obrasca putem Resend API-ja, sa PDF prilogom (A4, base64).
 * RESEND_API_KEY + RESEND_FROM u okruženju; primalac: CONTACT_FORM_NOTIFY_EMAIL ili info@humanreproduction.com
 */

import { sendResendEmailWithFallbacks } from "@/lib/email/send-resend-email";
import type { ContactPdfBranding, ContactPdfPayload } from "@/lib/pdf/generate-contact-pdf";

export function buildContactEmailSummary(
  p: ContactPdfPayload,
  branding: ContactPdfBranding,
): string {
  const lines = [
    "Nova poruka sa kontakt forme na sajtu.",
    "",
    `Ime i prezime: ${p.fullName}`,
    `Email: ${p.email}`,
    `Telefon: ${p.phone}`,
    p.inquiryType ? `Tip upita / usluga: ${p.inquiryType}` : null,
    "",
    "Poruka (skraćeno):",
    p.message.length > 700 ? `${p.message.slice(0, 700)}…` : p.message,
    "",
    "Saglasnost za obradu podataka: da",
    "",
    `Klinika: ${branding.clinicName}`,
    `Datum slanja (server): ${p.submittedAt.toISOString()}`,
    "",
    "Puni pregled je u prilogu (PDF, A4 — spreman za štampu).",
  ];

  return lines.filter((x) => x !== null).join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildContactEmailHtml(
  p: ContactPdfPayload,
  branding: ContactPdfBranding,
): string {
  const msg =
    p.message.length > 1200
      ? `${escapeHtml(p.message.slice(0, 1200))}…`
      : escapeHtml(p.message);

  return `<!DOCTYPE html>
<html lang="sr">
<body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1208;line-height:1.5;max-width:560px">
  <p style="margin:0 0 12px;font-size:15px"><strong>Nova poruka sa kontakt forme</strong></p>
  <p style="margin:0 0 16px;color:#555;font-size:13px">${escapeHtml(branding.clinicName)} · ${escapeHtml(branding.clinicWeb)}</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:140px">Ime i prezime</td><td style="padding:6px 0"><strong>${escapeHtml(p.fullName)}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></td></tr>
    <tr><td style="padding:6px 0;color:#666">Telefon</td><td style="padding:6px 0">${escapeHtml(p.phone)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Tip upita</td><td style="padding:6px 0">${escapeHtml(p.inquiryType?.trim() || "—")}</td></tr>
  </table>
  <p style="margin:20px 0 8px;font-size:13px;color:#666">Poruka</p>
  <div style="background:#faf8f5;border:1px solid #eadfce;border-radius:8px;padding:12px 14px;font-size:14px;white-space:pre-wrap">${msg}</div>
  <p style="margin:20px 0 0;font-size:12px;color:#888">PDF u prilogu (A4, logo + svi podaci) — otvorite i odštampajte.</p>
</body>
</html>`;
}

export type SendContactEmailResult =
  | { ok: true }
  | { ok: false; code: "missing_api_key" }
  | { ok: false; code: "resend_http"; status: number; bodySnippet: string };

export async function sendContactFormEmail(opts: {
  to: string;
  replyTo?: string;
  subject: string;
  summaryText: string;
  html?: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<SendContactEmailResult> {
  const sent = await sendResendEmailWithFallbacks({
    to: opts.to,
    subject: opts.subject,
    text: opts.summaryText,
    html: opts.html,
    replyTo: opts.replyTo,
    pdfBuffer: opts.pdfBuffer,
    pdfFilename: opts.pdfFilename,
    logPrefix: "[contact form email]",
  });

  if (sent.ok) return { ok: true };
  if (sent.code === "missing_api_key") return { ok: false, code: "missing_api_key" };
  return {
    ok: false,
    code: "resend_http",
    status: sent.status,
    bodySnippet: sent.bodySnippet,
  };
}
