import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { questionnaireSubmissions } from "@/lib/db/schema";

export async function countQuestionnaireSubmissionsForAdmin(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(questionnaireSubmissions);
  return row?.count ?? 0;
}

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

export async function getQuestionnaireSubmissionByIdForAdmin(id: string) {
  const [row] = await db
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
      pdfStorageKey: questionnaireSubmissions.pdfStorageKey,
      formDataJson: questionnaireSubmissions.formDataJson,
      staffEmailSent: questionnaireSubmissions.staffEmailSent,
      staffPdfEmailSent: questionnaireSubmissions.staffPdfEmailSent,
      patientEmailSent: questionnaireSubmissions.patientEmailSent,
      createdAt: questionnaireSubmissions.createdAt,
      ipAddress: questionnaireSubmissions.ipAddress,
    })
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.id, id))
    .limit(1);

  return row ?? null;
}
