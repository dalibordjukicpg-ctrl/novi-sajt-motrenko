import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  bookingAttachmentAbsPath,
  ensureBookingAttachmentsRootDir,
} from "@/lib/booking-attachment-storage";
import {
  mimeMatchesExtension,
  sniffUploadMime,
} from "@/lib/file-upload-magic";
import type { BookingAttachmentMeta } from "@/lib/validations/booking-attachments";
import {
  extOf,
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
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extOf(file.name || "dokument");
    const sniffed = sniffUploadMime(buf);
    if (!sniffed || !mimeMatchesExtension(ext, sniffed)) {
      throw new Error("attachment rejected: mime mismatch");
    }

    const id = randomUUID();
    const safeName = sanitizeBookingFilename(file.name || "dokument");
    const storedName = `${id}${ext || ""}`;
    const storageKey = `booking-attachments/${requestId}/${storedName}`;
    const abs = bookingAttachmentAbsPath(storageKey);
    if (!abs) continue;

    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buf);

    out.push({
      id,
      filename: safeName,
      mimeType: sniffed,
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
