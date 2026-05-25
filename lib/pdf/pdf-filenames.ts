/** Fiksna imena priloga — bez emaila ili ličnih podataka korisnika. */

export function bookingPdfAttachmentName(publicRef: string): string {
  const ref = publicRef.replace(/[^A-Za-z0-9-]/g, "").slice(0, 12).toUpperCase();
  return `prijavnica-HRC-${ref || "NOVI"}.pdf`;
}

export function contactPdfAttachmentName(submissionId: string): string {
  const id = submissionId.replace(/[^A-Za-z0-9-]/g, "").slice(0, 8).toUpperCase();
  return `kontakt-upit-HRC-${id || "NOVI"}.pdf`;
}

/** Skraćuje dugačak tekst da stane u A4 blok. */
export function truncateForPdf(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1).trim()}…`;
}
