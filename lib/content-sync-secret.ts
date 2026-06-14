/**
 * Tajni ključ za sync sadržaja (lokal ↔ produkcija).
 * Postavi CONTENT_SYNC_SECRET u .env / Hostinger env — ne commituj stvarnu vrijednost.
 */
export function getContentSyncSecret(): string {
  const fromEnv = process.env.CONTENT_SYNC_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CONTENT_SYNC_SECRET nije postavljen u produkciji.");
  }
  return "dev-content-sync";
}
