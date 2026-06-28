import { writeFile } from "fs/promises";

import type { Locale } from "@/lib/i18n";
import { generateQuestionnairePdf } from "@/lib/pdf/generate-questionnaire-pdf";
import type { PdfBranding } from "@/lib/pdf/pdf-layout";
import {
  ensureQuestionnaireSubmissionsRootDir,
  questionnaireSubmissionPdfAbsPath,
} from "@/lib/questionnaire-submission-storage";

/** Regeneriše PDF sa diska iz sačuvanog JSON-a (fallback ako fajl nedostaje). */
export async function regenerateQuestionnairePdfFile(opts: {
  locale: Locale;
  formData: Record<string, unknown>;
  submittedAt: Date;
  pdfStorageKey: string;
  branding: PdfBranding;
}): Promise<Buffer> {
  const pdf = await generateQuestionnairePdf(
    {
      submittedAt: opts.submittedAt,
      submissionLocale: opts.locale,
      data: opts.formData,
    },
    opts.branding,
  );

  const abs = questionnaireSubmissionPdfAbsPath(opts.pdfStorageKey);
  if (abs) {
    ensureQuestionnaireSubmissionsRootDir();
    await writeFile(abs, pdf);
  }

  return pdf;
}

export function parseQuestionnaireFormDataJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* */
  }
  return {};
}
