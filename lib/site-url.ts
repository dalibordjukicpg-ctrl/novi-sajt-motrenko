/** Kanonski produkcijski domen (Hostinger). */
export const PRODUCTION_SITE_URL = "https://humanreproduction.com";

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Javni origin sajta — canonical, Open Graph, sitemap, email linkovi.
 * Prioritet: NEXT_PUBLIC_SITE_URL → SITE_URL → APP_URL → produkcija / localhost.
 */
export function getSiteUrl(): string {
  for (const key of [
    "NEXT_PUBLIC_SITE_URL",
    "SITE_URL",
    "APP_URL",
  ] as const) {
    const v = process.env[key]?.trim();
    if (v) return normalizeOrigin(v);
  }
  if (process.env.NODE_ENV === "production") return PRODUCTION_SITE_URL;
  return "http://localhost:7392";
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`);
}

/** Apsolutni URL za relativnu putanju (npr. `/me/s/kontakt`). */
export function absoluteSiteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${p}`;
}

/** Preview / staging Hostinger domen — ne indeksirati u Google. */
export function isPreviewHost(host: string | null | undefined): boolean {
  const h = (host ?? "").trim().toLowerCase();
  if (!h) return false;
  return h.includes("hostingersite.com");
}
