import type { Locale } from "@/lib/i18n";
import { getQuestionnaireI18n } from "@/lib/questionnaire-i18n";

import {
  buildQuestionnairePdfSections,
  questionnaireFilledLanguageNote,
  questionnairePdfMetaLabels,
} from "./build-questionnaire-pdf-sections";
import {
  bufferFromPdfDoc,
  createA4PdfDocument,
  drawFlowSections,
  drawFootersAllPages,
  drawPdfHeader,
  drawQuestionnaireSignature,
  QUESTIONNAIRE_FLOW,
  type PdfBranding,
} from "./pdf-layout";
import { parseQuestionnaireSignaturePng } from "@/lib/questionnaire/parse-signature-png";

export type QuestionnairePdfPayload = {
  submittedAt: Date;
  submissionLocale: Locale;
  data: Record<string, unknown>;
};

export async function generateQuestionnairePdf(
  payload: QuestionnairePdfPayload,
  branding: PdfBranding,
): Promise<Buffer> {
  const t = getQuestionnaireI18n("me");
  const meta = questionnairePdfMetaLabels(t);
  const femaleName = String(payload.data.z_ime || "Pacijent").trim();
  const note = questionnaireFilledLanguageNote(payload.submissionLocale);

  const doc = createA4PdfDocument({
    title: `${t.email.emailTitle} — A4`,
    author: branding.clinicName,
    subject: `${t.email.emailTitle}: ${femaleName}`,
    keywords: "upitnik, questionnaire, A4",
    creator: "Website questionnaire form",
  });

  const pdfPromise = bufferFromPdfDoc(doc);

  drawPdfHeader(doc, {
    title: t.email.emailTitle,
    subtitle: note,
    submittedAt: payload.submittedAt,
    locale: payload.submissionLocale,
    metaLabels: {
      submittedAt: meta.submittedAt,
      formLanguage: meta.formLanguage,
      referenceId: "",
    },
    dateLocale: "sr-Latn-ME",
  });

  drawFlowSections(doc, buildQuestionnairePdfSections(payload.data, t), QUESTIONNAIRE_FLOW);

  const signaturePng = parseQuestionnaireSignaturePng(payload.data.potpis_png);
  if (signaturePng) {
    drawQuestionnaireSignature(doc, signaturePng, t.ui.signaturePdfTitle);
  }

  drawFootersAllPages(doc, branding);
  doc.end();
  return pdfPromise;
}
