import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { questionnaireSubmissions } from "@/lib/db/schema";

export async function listQuestionnaireSubmissionsForAdmin(limit = 200) {
  return db
    .select({
      id: questionnaireSubmissions.id,
      locale: questionnaireSubmissions.locale,
      femaleName: questionnaireSubmissions.femaleName,
      femaleEmail: questionnaireSubmissions.femaleEmail,
      maleName: questionnaireSubmissions.maleName,
      maleEmail: questionnaireSubmissions.maleEmail,
      phone: questionnaireSubmissions.phone,
      pdfFilename: questionnaireSubmissions.pdfFilename,
      pdfSizeBytes: questionnaireSubmissions.pdfSizeBytes,
      staffEmailSent: questionnaireSubmissions.staffEmailSent,
      staffPdfEmailSent: questionnaireSubmissions.staffPdfEmailSent,
      patientEmailSent: questionnaireSubmissions.patientEmailSent,
      createdAt: questionnaireSubmissions.createdAt,
    })
    .from(questionnaireSubmissions)
    .orderBy(desc(questionnaireSubmissions.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}
