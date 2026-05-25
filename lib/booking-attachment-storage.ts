import fs from "fs";
import path from "path";

/** Van deploy foldera — medicinski prilozi ne idu u git/public. */
export function getBookingAttachmentsRootDir(): string {
  const env = process.env.BOOKING_ATTACHMENTS_DIR?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
  }
  if (process.env.NODE_ENV === "production") {
    return path.join(process.cwd(), "..", "private", "booking-attachments");
  }
  return path.join(process.cwd(), "var", "booking-attachments");
}

export function ensureBookingAttachmentsRootDir(): string {
  const root = getBookingAttachmentsRootDir();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function bookingAttachmentAbsPath(storageKey: string): string | null {
  const k = storageKey.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!k || k.includes("..") || /^https?:\/\//i.test(k)) return null;
  if (!k.startsWith("booking-attachments/")) return null;
  const rel = k.slice("booking-attachments/".length);
  if (!rel) return null;
  return path.join(getBookingAttachmentsRootDir(), ...rel.split("/"));
}
