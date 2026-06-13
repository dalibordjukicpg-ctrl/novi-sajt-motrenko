import { readFile } from "fs/promises";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { db } from "@/lib/db";
import { questionnaireSubmissions } from "@/lib/db/schema";
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
      pdfStorageKey: questionnaireSubmissions.pdfStorageKey,
      pdfFilename: questionnaireSubmissions.pdfFilename,
    })
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.id, id))
    .limit(1);

  if (!row) return new NextResponse(null, { status: 404 });

  const abs = questionnaireSubmissionPdfAbsPath(row.pdfStorageKey);
  if (!abs) return new NextResponse(null, { status: 404 });

  try {
    const buf = await readFile(abs);
    const filename = row.pdfFilename.replace(/"/g, "");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
