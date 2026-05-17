/**
 * Slanje kontakt obrasca putem Resend API-ja, sa PDF prilogom (base64).
 * Koristi RESEND_API_KEY i RESEND_FROM iz okruženja.
 * Primalac poruke i PDF-a: fiksno info@humanreproduction.com (vidi app/api/contact/route.ts).
 */

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
    "Puni pregled je u prilogu (PDF, A4).",
  ];

  return lines.filter((x) => x !== null).join("\n");
}

export type SendContactEmailResult =
  | { ok: true }
  | { ok: false; code: "missing_api_key" }
  | { ok: false; code: "resend_http"; status: number; bodySnippet: string };

export async function sendContactFormEmail(opts: {
  to: string;
  summaryText: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<SendContactEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ?? "Kontakt <onboarding@resend.dev>";

  if (!key) {
    console.error(
      "[contact form email] RESEND_API_KEY nedostaje — poruka nije poslata.",
    );
    return { ok: false, code: "missing_api_key" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: "Novi kontakt upit sa sajta",
      text: opts.summaryText,
      attachments: [
        {
          filename: opts.pdfFilename,
          content: opts.pdfBuffer.toString("base64"),
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[contact form email] Resend error", res.status, t);
    return {
      ok: false,
      code: "resend_http",
      status: res.status,
      bodySnippet: t.slice(0, 400),
    };
  }

  return { ok: true };
}
