import { readFile } from "fs/promises";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { db } from "@/lib/db";
import { questionnaireSubmissions } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import {
  parseQuestionnaireFormDataJson,
  regenerateQuestionnairePdfFile,
} from "@/lib/questionnaire/regenerate-questionnaire-pdf";
import { questionnairePdfBranding } from "@/lib/questionnaire/questionnaire-pdf-branding";
import { questionnaireSubmissionPdfAbsPath } from "@/lib/questionnaire-submission-storage";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return new NextResponse(null, { status: 403 });
  }

  const { id } = await params;
  if (id.length !== 36) {
    return new NextResponse(null, { status: 400 });
  }

  const [row] = await db
    .select({
      locale: questionnaireSubmissions.locale,
      pdfStorageKey: questionnaireSubmissions.pdfStorageKey,
      pdfFilename: questionnaireSubmissions.pdfFilename,
      formDataJson: questionnaireSubmissions.formDataJson,
      createdAt: questionnaireSubmissions.createdAt,
    })
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.id, id))
    .limit(1);

  if (!row) return new NextResponse(null, { status: 404 });

  const filename = row.pdfFilename.replace(/"/g, "");
  const abs = questionnaireSubmissionPdfAbsPath(row.pdfStorageKey);

  if (abs) {
    try {
      const buf = await readFile(abs);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      /* fallback: regenerate from JSON */
    }
  }

  const locale: Locale = isLocale(row.locale) ? row.locale : "me";
  const formData = parseQuestionnaireFormDataJson(row.formDataJson);

  try {
    const buf = await regenerateQuestionnairePdfFile({
      locale,
      formData,
      submittedAt: row.createdAt,
      pdfStorageKey: row.pdfStorageKey,
      branding: questionnairePdfBranding(),
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[admin questionnaire pdf]", id, e);
    return new NextResponse(null, { status: 500 });
  }
}
