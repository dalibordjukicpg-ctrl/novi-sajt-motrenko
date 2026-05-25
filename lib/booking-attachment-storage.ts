import fs from "fs";
import path from "path";

function candidateRoots(): string[] {
  const env = process.env.BOOKING_ATTACHMENTS_DIR?.trim();
  if (env) {
    return [path.isAbsolute(env) ? env : path.join(process.cwd(), env)];
  }
  if (process.env.NODE_ENV === "production") {
    return [
      path.join(process.cwd(), "..", "private", "booking-attachments"),
      path.join(process.cwd(), "var", "booking-attachments"),
    ];
  }
  return [path.join(process.cwd(), "var", "booking-attachments")];
}

let resolvedRoot: string | null = null;

/** Van deploy foldera — medicinski prilozi ne idu u git/public. */
export function getBookingAttachmentsRootDir(): string {
  if (resolvedRoot) return resolvedRoot;
  return candidateRoots()[0];
}

export function ensureBookingAttachmentsRootDir(): string {
  if (resolvedRoot) return resolvedRoot;

  let lastErr: unknown;
  for (const root of candidateRoots()) {
    try {
      fs.mkdirSync(root, { recursive: true });
      fs.accessSync(root, fs.constants.W_OK);
      resolvedRoot = root;
      return root;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("booking-attachments folder is not writable");
}

export function bookingAttachmentAbsPath(storageKey: string): string | null {
  const k = storageKey.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!k || k.includes("..") || /^https?:\/\//i.test(k)) return null;
  if (!k.startsWith("booking-attachments/")) return null;
  const rel = k.slice("booking-attachments/".length);
  if (!rel) return null;
  return path.join(getBookingAttachmentsRootDir(), ...rel.split("/"));
}
