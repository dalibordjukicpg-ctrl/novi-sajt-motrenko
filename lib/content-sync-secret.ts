/**
 * Tajni ključ za sync sadržaja (lokal ↔ produkcija).
 * Ide kroz git deploy — ne treba ručno dodavati na Hostingeru.
 * Privatni repo; štiti samo CMS sadržaj (ne korisnike/lozinke).
 */
export const CONTENT_SYNC_SECRET = "hrc-motrenko-content-sync-2026";
