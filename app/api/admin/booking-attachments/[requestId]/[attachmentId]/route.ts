import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { bookingAttachmentAbsPath } from "@/lib/booking-attachment-storage";
import { parseBookingAttachmentsJson } from "@/lib/booking/save-booking-attachments";
import { db } from "@/lib/db";
import { appointmentRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

type Props = {
  params: Promise<{ requestId: string; attachmentId: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }
  if (!hasPermission(session.role, PERMISSIONS.BOOKING_REQUESTS_VIEW)) {
    return new NextResponse(null, { status: 403 });
  }

  const { requestId, attachmentId } = await params;
  if (requestId.length !== 36 || attachmentId.length !== 36) {
    return new NextResponse(null, { status: 400 });
  }

  const [row] = await db
    .select({ attachmentsJson: appointmentRequests.attachmentsJson })
    .from(appointmentRequests)
    .where(eq(appointmentRequests.id, requestId))
    .limit(1);

  if (!row) return new NextResponse(null, { status: 404 });

  const attachments = parseBookingAttachmentsJson(row.attachmentsJson);
  const att = attachments.find((a) => a.id === attachmentId);
  if (!att) return new NextResponse(null, { status: 404 });

  const abs = bookingAttachmentAbsPath(att.storageKey);
  if (!abs) return new NextResponse(null, { status: 404 });

  try {
    const buf = await readFile(abs);
    const ext = path.extname(att.filename).toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": att.mimeType || MIME[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${att.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
