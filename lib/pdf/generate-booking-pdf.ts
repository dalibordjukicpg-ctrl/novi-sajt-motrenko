import type { BookingIntakeLabels } from "@/lib/booking/intake-labels";
import type { BookingRequestInput } from "@/lib/validations/booking-request";

import {
  bufferFromPdfDoc,
  createA4PdfDocument,
  drawCategorySection,
  drawFooters,
  drawPdfHeader,
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

  drawCategorySection(doc, {
    index: 1,
    title: labels.sectionBasic,
    fields: [
      { kind: "pair", label: labels.fullName, value: data.fullName },
      { kind: "pair", label: labels.email, value: data.email },
      { kind: "pair", label: labels.phone, value: data.phone },
      { kind: "pair", label: "Datum rođenja", value: dob },
    ],
  });

  drawCategorySection(doc, {
    index: 2,
    title: labels.whoAttends.replace(/\?$/, ""),
    fields: [
      { kind: "pair", label: labels.whoAttends, value: who },
      { kind: "pair", label: labels.partnerName, value: partnerName },
      { kind: "pair", label: labels.partnerPhone, value: partnerPhone },
    ],
  });

  drawCategorySection(doc, {
    index: 3,
    title: labels.sectionReasonVisit,
    fields: [
      {
        kind: "block",
        label: labels.whatBroughtYou,
        value: data.whatBroughtYou.trim(),
      },
      {
        kind: "pair",
        label: labels.tryingConceive.replace(/\?$/, ""),
        value: ttc,
      },
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
          ? "Korisnik je potvrdio saglasnost sa obradom ličnih podataka radi zakazivanja i pripreme pregleda."
          : "Saglasnost nije zabilježena.",
      },
    ],
  });

  drawFooters(doc, branding);
  doc.end();
  return pdfPromise;
}
