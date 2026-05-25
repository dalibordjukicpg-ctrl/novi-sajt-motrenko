import {
  bufferFromPdfDoc,
  createA4PdfDocument,
  drawCategorySection,
  drawFooters,
  drawPdfHeader,
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

  drawPdfHeader(doc, {
    title: "Kontakt upit sa veb prezentacije",
    submittedAt: data.submittedAt,
    locale: data.locale,
  });

  drawCategorySection(doc, {
    index: 1,
    title: "Podaci korisnika",
    fields: [
      { kind: "pair", label: "Ime i prezime", value: data.fullName },
    ],
  });

  drawCategorySection(doc, {
    index: 2,
    title: "Kontakt",
    fields: [
      { kind: "pair", label: "E-mail", value: data.email },
      { kind: "pair", label: "Telefon", value: data.phone },
    ],
  });

  drawCategorySection(doc, {
    index: 3,
    title: "Razlog javljanja",
    fields: [
      {
        kind: "pair",
        label: "Tip upita / usluga",
        value:
          data.inquiryType && data.inquiryType.trim().length > 0
            ? data.inquiryType.trim()
            : "—",
      },
      { kind: "block", label: "Poruka", value: data.message.trim(), maxChars: 480 },
    ],
  });

  drawCategorySection(doc, {
    index: 4,
    title: "Saglasnost",
    fields: [
      {
        kind: "block",
        label: "Potvrda",
        value: data.consentAccepted
          ? "Potvrđena saglasnost za obradu podataka radi odgovora na upit."
          : "Saglasnost nije zabilježena.",
      },
    ],
  });

  drawFooters(doc, branding);
  doc.end();
  return pdfPromise;
}
