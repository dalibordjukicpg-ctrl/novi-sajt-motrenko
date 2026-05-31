import { getContactStaffPdfLabels } from "@/lib/pdf/contact-pdf-labels";

import { enrichPatientTextsForStaff } from "./enrich-patient-text-for-staff";
import {
  assertSinglePdfPage,
  bufferFromPdfDoc,
  createA4PdfDocument,
  drawFooters,
  drawPdfHeader,
  drawSinglePageSections,
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
  const labels = getContactStaffPdfLabels();

  const inquiryRaw =
    data.inquiryType && data.inquiryType.trim().length > 0
      ? data.inquiryType.trim()
      : "";
  const [inquiryDisplay, messageDisplay] = await enrichPatientTextsForStaff(
    [inquiryRaw, data.message],
    data.locale,
    labels.patientTranslation,
  );

  const doc = createA4PdfDocument({
    title: `${labels.title} — A4`,
    author: branding.clinicName,
    subject: `${labels.title}: ${data.fullName}`,
    keywords: "kontakt, contact, A4",
    creator: "Website contact form",
  });

  const pdfPromise = bufferFromPdfDoc(doc);

  drawPdfHeader(doc, {
    title: labels.title,
    submittedAt: data.submittedAt,
    locale: data.locale,
    metaLabels: {
      submittedAt: labels.metaSubmitted,
      formLanguage: labels.metaLanguage,
      referenceId: "",
    },
  });

  drawSinglePageSections(doc, [
    {
      index: 1,
      title: labels.sectionUser,
      fields: [{ kind: "pair", label: labels.fullName, value: data.fullName }],
    },
    {
      index: 2,
      title: labels.sectionContact,
      fields: [
        { kind: "pair", label: labels.email, value: data.email },
        { kind: "pair", label: labels.phone, value: data.phone },
      ],
    },
    {
      index: 3,
      title: labels.sectionReason,
      fields: [
        {
          kind: "pair",
          label: labels.inquiryType,
          value: inquiryRaw ? inquiryDisplay : "—",
        },
        {
          kind: "block",
          label: labels.message,
          value: messageDisplay,
          flex: 2,
        },
      ],
    },
    {
      index: 4,
      title: labels.sectionConsent,
      fields: [
        {
          kind: "block",
          label: labels.confirmation,
          value: data.consentAccepted
            ? labels.consentConfirmed
            : labels.consentMissing,
          flex: 1,
        },
      ],
    },
  ]);

  drawFooters(doc, branding);
  assertSinglePdfPage(doc);
  doc.end();
  return pdfPromise;
}
