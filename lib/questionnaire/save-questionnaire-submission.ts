import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { questionnaireSubmissions } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import {
  ensureQuestionnaireSubmissionsRootDir,
  questionnaireSubmissionPdfAbsPath,
} from "@/lib/questionnaire-submission-storage";

export type SaveQuestionnaireSubmissionInput = {
  locale: Locale;
  femaleName: string;
  femaleEmail: string;
  maleName: string | null;
  maleEmail: string | null;
  phone: string | null;
  formData: Record<string, unknown>;
  pdfBuffer: Buffer;
  pdfFilename: string;
  submittedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function saveQuestionnaireSubmission(
  input: SaveQuestionnaireSubmissionInput,
): Promise<{ id: string }> {
  const id = randomUUID();
  const pdfStorageKey = `questionnaire-pdfs/${id}.pdf`;
  const abs = questionnaireSubmissionPdfAbsPath(pdfStorageKey);
  if (!abs) throw new Error("invalid pdf storage key");

  ensureQuestionnaireSubmissionsRootDir();
  await writeFile(abs, input.pdfBuffer);

  await db.insert(questionnaireSubmissions).values({
    id,
    locale: input.locale,
    femaleName: input.femaleName.slice(0, 200) || "Pacijent",
    femaleEmail: input.femaleEmail.slice(0, 255) || "—",
    maleName: input.maleName?.slice(0, 200) ?? null,
    maleEmail: input.maleEmail?.slice(0, 255) ?? null,
    phone: input.phone?.slice(0, 64) ?? null,
    formDataJson: JSON.stringify(input.formData),
    pdfStorageKey,
    pdfFilename: input.pdfFilename.slice(0, 255),
    pdfSizeBytes: input.pdfBuffer.length,
    staffEmailSent: false,
    staffPdfEmailSent: false,
    patientEmailSent: false,
    createdAt: input.submittedAt,
    ipAddress: input.ipAddress?.slice(0, 45) ?? null,
    userAgent: input.userAgent,
  });

  return { id };
}

export type QuestionnaireEmailFlags = {
  staffEmailSent?: boolean;
  staffPdfEmailSent?: boolean;
  patientEmailSent?: boolean;
};

export async function updateQuestionnaireSubmissionEmailFlags(
  id: string,
  flags: QuestionnaireEmailFlags,
): Promise<void> {
  const patch: QuestionnaireEmailFlags = {};
  if (flags.staffEmailSent !== undefined) patch.staffEmailSent = flags.staffEmailSent;
  if (flags.staffPdfEmailSent !== undefined) patch.staffPdfEmailSent = flags.staffPdfEmailSent;
  if (flags.patientEmailSent !== undefined) patch.patientEmailSent = flags.patientEmailSent;
  if (Object.keys(patch).length === 0) return;

  await db
    .update(questionnaireSubmissions)
    .set(patch)
    .where(eq(questionnaireSubmissions.id, id));
}
