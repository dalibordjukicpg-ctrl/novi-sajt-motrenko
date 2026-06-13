/** Sigurno ime fajla iz email adrese (Windows + email prilozi). */
function emailToPdfBasename(email: string): string {
  const raw = email.trim().toLowerCase();
  const safe = raw
    .replace(/[^a-z0-9@.+_-]/g, "")
    .replace(/@+/g, "@")
    .slice(0, 120);
  return safe.length > 0 ? safe : "prijavnica-bez-emaila";
}

/** Ime priloga za prijavnicu — email korisnika radi lakše pretrage u inboxu. */
export function bookingPdfAttachmentName(email: string): string {
  return `${emailToPdfBasename(email)}.pdf`;
}

export function contactPdfAttachmentName(submissionId: string): string {
  const id = submissionId.replace(/[^A-Za-z0-9-]/g, "").slice(0, 8).toUpperCase();
  return `kontakt-upit-HRC-${id || "NOVI"}.pdf`;
}

/** Ime PDF priloga za upitnik — email ženske strane za lakšu pretragu. */
export function questionnairePdfAttachmentName(email: string): string {
  return `upitnik-${emailToPdfBasename(email)}.pdf`;
}

/** Skraćuje dugačak tekst da stane u A4 blok. */
export function truncateForPdf(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1).trim()}…`;
}
