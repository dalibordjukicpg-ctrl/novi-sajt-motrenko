import path from "path";

export const BOOKING_ATTACHMENT_MAX_FILES = 5;
export const BOOKING_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const BOOKING_ATTACHMENT_MAX_TOTAL_BYTES = 24 * 1024 * 1024;

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
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

export { extOf };

const BANNED_INNER_EXT = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "sh",
  "js",
  "php",
  "html",
  "htm",
  "svg",
  "dll",
  "scr",
]);

/** Odbij file.pdf.exe, report.doc.js, itd. */
export function hasDangerousUploadFilename(name: string): boolean {
  const base = path.basename(name || "file");
  if (!base || /\0/.test(base)) return true;
  const parts = base.split(".").filter((p) => p.length > 0);
  if (parts.length < 2) return true;
  const finalExt = `.${parts[parts.length - 1]!.toLowerCase()}`;
  if (!ALLOWED_EXT.has(finalExt)) return true;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i]!.toLowerCase();
    if (BANNED_INNER_EXT.has(seg)) return true;
    if (ALLOWED_EXT.has(`.${seg}`) && i < parts.length - 2) return true;
  }
  return false;
}

export function isAllowedBookingAttachment(file: File): boolean {
  if (hasDangerousUploadFilename(file.name || "file")) return false;
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
