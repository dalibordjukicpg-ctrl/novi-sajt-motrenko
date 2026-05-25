import path from "path";

export const BOOKING_ATTACHMENT_MAX_FILES = 5;
export const BOOKING_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const BOOKING_ATTACHMENT_MAX_TOTAL_BYTES = 24 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
]);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type BookingAttachmentMeta = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
};

export type BookingAttachmentValidationError =
  | "tooMany"
  | "tooLarge"
  | "totalTooLarge"
  | "type";

function extOf(name: string): string {
  return path.extname(name).toLowerCase().slice(0, 12);
}

export function isAllowedBookingAttachment(file: File): boolean {
  const ext = extOf(file.name || "file");
  if (!ALLOWED_EXT.has(ext)) return false;
  if (!file.type || file.type === "application/octet-stream") return true;
  return ALLOWED_MIME.has(file.type);
}

export function validateBookingAttachmentFiles(
  files: File[],
): { ok: true; files: File[] } | { ok: false; error: BookingAttachmentValidationError } {
  const picked = files.filter((f) => f instanceof File && f.size > 0);
  if (picked.length > BOOKING_ATTACHMENT_MAX_FILES) {
    return { ok: false, error: "tooMany" };
  }

  let total = 0;
  for (const file of picked) {
    if (!isAllowedBookingAttachment(file)) {
      return { ok: false, error: "type" };
    }
    if (file.size > BOOKING_ATTACHMENT_MAX_BYTES) {
      return { ok: false, error: "tooLarge" };
    }
    total += file.size;
  }
  if (total > BOOKING_ATTACHMENT_MAX_TOTAL_BYTES) {
    return { ok: false, error: "totalTooLarge" };
  }

  return { ok: true, files: picked };
}

export function sanitizeBookingFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()čćžšđČĆŽŠĐ]+/gi, "_");
  return base.slice(0, 120) || "dokument";
}

/** FormData fajl u Node/browser okruženju (ne oslanjaj se samo na instanceof File). */
export function isUploadFile(value: FormDataEntryValue): value is File {
  if (typeof value !== "object" || value === null) return false;
  const f = value as File;
  return (
    typeof f.size === "number" &&
    f.size > 0 &&
    typeof f.arrayBuffer === "function"
  );
}

export function attachmentFilesFromFormData(formData: FormData): File[] {
  return formData.getAll("attachments").filter(isUploadFile);
}
