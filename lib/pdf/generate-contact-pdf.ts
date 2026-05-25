import {
  bufferFromPdfDoc,
  createA4PdfDocument,
  drawFooters,
  drawPdfHeader,
  sectionHeading,
  type PdfBranding,
} from "./pdf-layout";

export type ContactPdfBranding = PdfBranding;

export type ContactPdfPayload = {
  submittedAt: Date;
  locale: string;
  fullName: string;
  email: string;
  phone: string;
  inquiryType: string | null;
  message: string;
  consentAccepted: boolean;
};

export async function generateContactPdf(
  data: ContactPdfPayload,
  branding: ContactPdfBranding,
): Promise<Buffer> {
  const doc = createA4PdfDocument({
    title: "Kontakt upit sa sajta — A4",
    author: branding.clinicName,
    subject: `Upit: ${data.fullName}`,
    keywords: "kontakt, ordinacija, A4",
    creator: "Website contact form",
  });

  const pdfPromise = bufferFromPdfDoc(doc);
  const cw = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawPdfHeader(doc, {
    title: "Kontakt upit sa veb prezentacije",
    submittedAt: data.submittedAt,
    locale: data.locale,
  });

  sectionHeading(doc, "1. Podaci korisnika");
  doc.text(`Ime i prezime: ${data.fullName}`, { width: cw, lineGap: 3 });

  sectionHeading(doc, "2. Kontakt");
  doc.text(`E-mail: ${data.email}`, { width: cw, lineGap: 3 });
  doc.text(`Telefon: ${data.phone}`, { width: cw, lineGap: 3 });

  sectionHeading(doc, "3. Razlog javljanja / tip usluge");
  doc.text(
    data.inquiryType && data.inquiryType.trim().length > 0
      ? data.inquiryType.trim()
      : "— (nije popunjeno)",
    { width: cw, lineGap: 4 },
  );

  sectionHeading(doc, "4. Poruka");
  doc.text(data.message.trim(), {
    width: cw,
    lineGap: 4,
    align: "left",
  });

  sectionHeading(doc, "5. Saglasnost");
  doc.text(
    data.consentAccepted
      ? "Korisnik je potvrdio saglasnost sa obradom ličnih podataka radi odgovora na upit."
      : "Saglasnost nije zabilježena.",
    { width: cw, lineGap: 4 },
  );

  drawFooters(doc, branding);
  doc.end();
  return pdfPromise;
}
