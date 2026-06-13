import { sendResendEmail, sendResendEmailWithFallbacks } from "@/lib/email/send-resend-email";
import type { QuestionnaireI18n } from "@/lib/questionnaire-i18n";
import type { PdfBranding } from "@/lib/pdf/pdf-layout";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function collectQuestionnaireRecipientEmails(data: Record<string, unknown>): string[] {
  const raw = [String(data.z_email ?? ""), String(data.m_email ?? "")]
    .map((e) => e.trim().toLowerCase())
    .filter(isValidEmail);
  return [...new Set(raw)];
}

export function buildQuestionnaireStaffHtml(opts: {
  t: QuestionnaireI18n;
  femaleName: string;
  femaleEmail: string;
  maleName: string;
  maleEmail: string;
  phone: string;
  submittedAt: Date;
  branding: PdfBranding;
  submissionLocale: string;
}): string {
  const { t, branding } = opts;
  const langNote =
    opts.submissionLocale !== "me"
      ? `<p style="margin:0 0 12px;font-size:13px;color:#7a4615;background:#fef3e8;border:1px solid #f3d4ab;border-radius:8px;padding:10px 12px">Pacijent je ispunjavao formu na ${opts.submissionLocale === "en" ? "engleskom" : "ruskom"} jeziku.</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="sr">
<body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1208;line-height:1.5;max-width:560px">
  <p style="margin:0 0 12px;font-size:15px"><strong>${escapeHtml(t.email.emailTitle)}</strong></p>
  <p style="margin:0 0 16px;color:#555;font-size:13px">${escapeHtml(branding.clinicName)} · ${escapeHtml(branding.clinicWeb)}</p>
  ${langNote}
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:150px">Ženski partner</td><td style="padding:6px 0"><strong>${escapeHtml(opts.femaleName)}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(opts.femaleEmail)}">${escapeHtml(opts.femaleEmail || "—")}</a></td></tr>
    <tr><td style="padding:6px 0;color:#666">Telefon</td><td style="padding:6px 0">${escapeHtml(opts.phone || "—")}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Muški partner</td><td style="padding:6px 0">${escapeHtml(opts.maleName || "—")}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Email (M)</td><td style="padding:6px 0">${escapeHtml(opts.maleEmail || "—")}</td></tr>
  </table>
  <p style="margin:20px 0 0;font-size:12px;color:#888">PDF u prilogu (A4, logo + svi podaci) — otvorite i odštampajte.</p>
  <p style="margin:8px 0 0;font-size:11px;color:#aaa">${escapeHtml(t.email.receivedAt)} ${escapeHtml(opts.submittedAt.toLocaleString("sr-ME", { timeZone: "Europe/Podgorica" }))}</p>
</body>
</html>`;
}

export function buildQuestionnairePatientConfirmation(opts: {
  t: QuestionnaireI18n;
  name: string;
  branding: PdfBranding;
}): { subject: string; text: string; html: string } {
  const greeting = opts.t.email.patientGreeting.replace("{name}", opts.name.trim() || opts.t.email.patientFallbackName);
  const subject = opts.t.email.patientSubject;
  const text = [
    greeting,
    "",
    opts.t.email.patientBody,
    "",
    opts.t.email.patientSignoff,
    opts.branding.clinicName,
    opts.branding.clinicWeb,
    opts.branding.clinicEmail,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="sr">
<body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1208;line-height:1.6;max-width:520px">
  <p style="margin:0 0 16px;font-size:15px">${escapeHtml(greeting)}</p>
  <p style="margin:0 0 16px;font-size:14px;color:#444">${escapeHtml(opts.t.email.patientBody)}</p>
  <p style="margin:0;font-size:14px;color:#444">${escapeHtml(opts.t.email.patientSignoff)}</p>
  <p style="margin:20px 0 0;font-size:13px;color:#666">
    <strong>${escapeHtml(opts.branding.clinicName)}</strong><br>
    ${escapeHtml(opts.branding.clinicWeb)}<br>
    ${escapeHtml(opts.branding.clinicEmail)}
  </p>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendQuestionnaireStaffEmail(opts: {
  to: string;
  subject: string;
  summaryText: string;
  html: string;
  replyTo?: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}) {
  return sendResendEmailWithFallbacks({
    to: opts.to,
    subject: opts.subject,
    text: opts.summaryText,
    html: opts.html,
    replyTo: opts.replyTo,
    pdfBuffer: opts.pdfBuffer,
    pdfFilename: opts.pdfFilename,
    logPrefix: "[upitnik:staff]",
  });
}

export async function sendQuestionnairePatientConfirmation(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  return sendResendEmail({
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    logPrefix: "[upitnik:patient]",
  });
}
