import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  bookingAttachmentAbsPath,
  ensureBookingAttachmentsRootDir,
} from "@/lib/booking-attachment-storage";
import type { BookingAttachmentMeta } from "@/lib/validations/booking-attachments";
import {
  sanitizeBookingFilename,
  validateBookingAttachmentFiles,
} from "@/lib/validations/booking-attachments";

export async function saveBookingAttachmentFiles(
  requestId: string,
  files: File[],
): Promise<BookingAttachmentMeta[]> {
  const validated = validateBookingAttachmentFiles(files);
  if (!validated.ok || validated.files.length === 0) return [];

  ensureBookingAttachmentsRootDir();
  const out: BookingAttachmentMeta[] = [];

  for (const file of validated.files) {
    const id = randomUUID();
    const safeName = sanitizeBookingFilename(file.name || "dokument");
    const ext = path.extname(safeName).slice(0, 12).toLowerCase();
    const storedName = `${id}${ext || ""}`;
    const storageKey = `booking-attachments/${requestId}/${storedName}`;
    const abs = bookingAttachmentAbsPath(storageKey);
    if (!abs) continue;

    const buf = Buffer.from(await file.arrayBuffer());
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buf);

    out.push({
      id,
      filename: safeName,
      mimeType: file.type || "application/octet-stream",
      size: buf.length,
      storageKey,
    });
  }

  if (validated.files.length > 0 && out.length === 0) {
    throw new Error("attachment save produced no files");
  }

  return out;
}

export function parseBookingAttachmentsJson(
  raw: string | null | undefined,
): BookingAttachmentMeta[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BookingAttachmentMeta =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as BookingAttachmentMeta).id === "string" &&
            typeof (item as BookingAttachmentMeta).storageKey === "string" &&
            typeof (item as BookingAttachmentMeta).filename === "string",
        ),
    );
  } catch {
    return [];
  }
}
