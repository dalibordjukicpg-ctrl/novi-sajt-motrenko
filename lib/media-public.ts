/**
 * Javni URL fajla iz `media.storage_key`.
 * Lokalne putanje (`uploads/…`, `wp-media/…`) su **relativne** — rade na bilo kom domenu
 * (humanreproduction.com, preview, localhost) i ne ovise o env pri prikazu.
 */
import { getSiteUrl } from "@/lib/site-url";

export function publicUrlFromMediaStorageKey(storageKey: string): string {
  const k = storageKey.trim();
  if (!k) return "";

  if (k.startsWith("http://") || k.startsWith("https://")) {
    return normalizeAbsoluteMediaUrl(k);
  }

  return `/${k.replace(/^\/+/, "")}`;
}

/** Apsolutni URL za email / eksterne linkove (koristi getSiteUrl). */
export function absolutePublicUrlFromMediaStorageKey(storageKey: string): string {
  const rel = publicUrlFromMediaStorageKey(storageKey);
  if (!rel) return "";
  if (rel.startsWith("http://") || rel.startsWith("https://")) return rel;

  const base = getSiteUrl();
  if (!base) return rel;
  return `${base}${rel.startsWith("/") ? rel : `/${rel}`}`;
}

/** localhost u apsolutnom URL-u → relativna putanja (mobil ne može učitati tvoj PC). */
function normalizeAbsoluteMediaUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local")
    ) {
      return u.pathname + u.search + u.hash;
    }
    if (u.protocol === "http:") {
      return url.replace(/^http:/i, "https:");
    }
  } catch {
    /* neispravan URL */
  }
  return url;
}
