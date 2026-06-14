/** Magic-byte provjera za priloge (PDF, JPG, PNG, WEBP). */

const PDF = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF....WEBP

export function sniffUploadMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf.subarray(0, 4).equals(PDF)) return "application/pdf";
  if (buf.length >= 3 && buf.subarray(0, 3).equals(JPEG)) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG)) return "image/png";
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).equals(RIFF) &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function mimeMatchesExtension(
  ext: string,
  sniffed: string | null,
): boolean {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const expected = map[ext.toLowerCase()];
  if (!expected) return false;
  return sniffed === expected;
}
