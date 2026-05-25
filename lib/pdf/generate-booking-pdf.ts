import type { BookingIntakeLabels } from "@/lib/booking/intake-labels";
import type { BookingRequestInput } from "@/lib/validations/booking-request";

import {
  bufferFromPdfDoc,
  createA4PdfDocument,
  drawFooters,
  drawPdfHeader,
  sectionHeading,
  type PdfBranding,
} from "./pdf-layout";

export type BookingPdfPayload = {
  submittedAt: Date;
  publicRef: string;
  data: BookingRequestInput;
  labels: BookingIntakeLabels;
};

export async function generateBookingPdf(
  payload: BookingPdfPayload,
  branding: PdfBranding,
): Promise<Buffer> {
  const { submittedAt, publicRef, data, labels } = payload;
  const doc = createA4PdfDocument({
    title: "Prijavnica za pregled — A4",
    author: branding.clinicName,
    subject: `Prijavnica: ${data.fullName}`,
    keywords: "prijavnica, termin, ordinacija, A4",
    creator: "Website booking form",
  });

  const pdfPromise = bufferFromPdfDoc(doc);
  const cw = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawPdfHeader(doc, {
    title: labels.formEyebrow,
    subtitle: labels.formTitle,
    submittedAt,
    locale: data.locale,
    publicRef,
  });

  const who =
    labels.whoAttendsOptions[
      data.whoAttends as keyof typeof labels.whoAttendsOptions
    ];
  const ttc =
    data.tryingConceiveDuration &&
    labels.ttcOptions[
      data.tryingConceiveDuration as keyof typeof labels.ttcOptions
    ]
      ? labels.ttcOptions[
          data.tryingConceiveDuration as keyof typeof labels.ttcOptions
        ]
      : "—";
  const dob =
    data.dateOfBirth && data.dateOfBirth.length > 0 ? data.dateOfBirth : "—";
  const partnerName =
    data.whoAttends === "patient_only"
      ? "—"
      : (data.partnerFullName ?? "").trim() || "—";
  const partnerPhone =
    data.whoAttends === "patient_only"
      ? "—"
      : (data.partnerPhone ?? "").trim() || "—";

  sectionHeading(doc, `1. ${labels.sectionBasic}`);
  doc.text(`${labels.fullName}: ${data.fullName}`, { width: cw, lineGap: 3 });
  doc.text(`${labels.email}: ${data.email}`, { width: cw, lineGap: 3 });
  doc.text(`${labels.phone}: ${data.phone}`, { width: cw, lineGap: 3 });
  doc.text(`Datum rođenja: ${dob}`, { width: cw, lineGap: 3 });

  sectionHeading(doc, `2. ${labels.whoAttends}`);
  doc.text(who, { width: cw, lineGap: 3 });
  doc.text(`${labels.partnerName}: ${partnerName}`, { width: cw, lineGap: 3 });
  doc.text(`${labels.partnerPhone}: ${partnerPhone}`, { width: cw, lineGap: 3 });

  sectionHeading(doc, `3. ${labels.sectionReasonVisit}`);
  doc.text(labels.whatBroughtYou, { width: cw, lineGap: 4 });
  doc.text(data.whatBroughtYou.trim(), { width: cw, lineGap: 4 });
  doc.moveDown(0.3);
  doc.text(`${labels.tryingConceive} ${ttc}`, { width: cw, lineGap: 4 });

  sectionHeading(doc, "4. Saglasnost");
  doc.text(
    data.consentAccepted
      ? "Korisnik je potvrdio saglasnost sa obradom ličnih podataka radi zakazivanja i pripreme pregleda."
      : "Saglasnost nije zabilježena.",
    { width: cw, lineGap: 4 },
  );

  drawFooters(doc, branding);
  doc.end();
  return pdfPromise;
}
