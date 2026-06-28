/** PNG potpis sa upitnika (data URL) → Buffer za PDF. */

const MAX_BYTES = 512 * 1024;
const MIN_BYTES = 80;
const PNG_PREFIX = "data:image/png;base64,";

export function parseQuestionnaireSignaturePng(raw: unknown): Buffer | null {
  if (typeof raw !== "string" || !raw.startsWith(PNG_PREFIX)) return null;
  const b64 = raw.slice(PNG_PREFIX.length).trim();
  if (!b64 || b64.length > MAX_BYTES * 1.4) return null;
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length < MIN_BYTES || buf.length > MAX_BYTES) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      return null;
    }
    return buf;
  } catch {
    return null;
  }
}

/** Ukloni nevalidan potpis prije snimanja u bazu. */
export function normalizeQuestionnaireSignatureField(
  data: Record<string, unknown>,
): void {
  const parsed = parseQuestionnaireSignaturePng(data.potpis_png);
  if (!parsed) {
    delete data.potpis_png;
  }
}
