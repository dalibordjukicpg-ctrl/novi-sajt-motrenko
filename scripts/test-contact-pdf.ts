/**
 * Lokalni test: generiše A4 PDF kontakt forme (i opciono šalje test email).
 * npm run test:contact-pdf
 * npm run test:contact-pdf -- --send   (zahtijeva RESEND_API_KEY u .env)
 */
import fs from "fs";
import path from "path";

import { sendContactFormEmail } from "@/lib/email/send-contact-form";
import { generateContactPdf } from "@/lib/pdf/generate-contact-pdf";

async function main() {
  const send = process.argv.includes("--send");
  const payload = {
    submittedAt: new Date(),
    locale: "me",
    fullName: "Test Korisnik",
    email: "test@example.com",
    phone: "+382 67 123 456",
    inquiryType: "Konsultacija / IVF",
    message:
      "Ovo je test poruka sa kontakt forme.\n\nPDF treba imati logo, A4 format i sve podatke spremne za štampu.",
    consentAccepted: true,
  };
  const branding = {
    clinicName: process.env.CONTACT_PDF_CLINIC_NAME?.trim() || "Human Reproduction Center",
    clinicEmail:
      process.env.CONTACT_PDF_CLINIC_EMAIL?.trim() || "info@humanreproduction.com",
    clinicWeb: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://humanreproduction.com",
    clinicAddress: process.env.CONTACT_PDF_CLINIC_ADDRESS?.trim() || undefined,
  };

  const pdf = await generateContactPdf(payload, branding);
  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "kontakt-test-a4.pdf");
  fs.writeFileSync(outPath, pdf);
  console.log("[test:contact-pdf] PDF sačuvan:", outPath, `(${pdf.length} bajtova)`);

  if (!send) {
    console.log("[test:contact-pdf] Otvori PDF i provjeri A4 štampu. Za test email: npm run test:contact-pdf -- --send");
    return;
  }

  const to =
    process.env.CONTACT_FORM_NOTIFY_EMAIL?.trim() || "info@humanreproduction.com";
  const { buildContactEmailSummary, buildContactEmailHtml } = await import(
    "@/lib/email/send-contact-form"
  );
  const res = await sendContactFormEmail({
    to,
    replyTo: payload.email,
    subject: `TEST kontakt upit — ${payload.fullName}`,
    summaryText: buildContactEmailSummary(payload, branding),
    html: buildContactEmailHtml(payload, branding),
    pdfBuffer: pdf,
    pdfFilename: "kontakt-test-a4.pdf",
  });

  if (!res.ok) {
    console.error("[test:contact-pdf] Email nije poslat:", res);
    process.exit(1);
  }
  console.log("[test:contact-pdf] Test email poslat na:", to);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
