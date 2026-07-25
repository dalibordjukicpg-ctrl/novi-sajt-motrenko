/**
 * Normalizuj link virtuelne ture (Google Street View / 360°) u URL za iframe.
 *
 * Google Maps embed radi SAMO unutar <iframe> i ne traži API ključ:
 *   - /maps/embed?pb=…!1s<PANO_ID>…   → zaključava tačnu panoramu (preporučeno)
 *   - /maps?…&cbll=lat,lng&output=svembed → Google bira najbližu panoramu
 *
 * Kratki maps.app.goo.gl linkovi ne sadrže pano ID dok se ne razriješi
 * redirect, pa ih resolveVirtualTourEmbedUrl() razrješava pri snimanju u adminu.
 */

/** Provjereno radi u iframe-u; `5f` je zoom/FOV faktor Google embeda. */
const EMBED_FOV = "0.75";

function isGoogleMapsHost(hostname: string): boolean {
  return /(^|\.)google\.[a-z.]+$/i.test(hostname) && hostname.includes("google");
}

/** maps.app.goo.gl/… i goo.gl/maps/… — sadržaj je poznat samo nakon redirecta. */
export function isGoogleMapsShortLink(raw: string | null | undefined): boolean {
  const url = raw?.trim();
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname === "maps.app.goo.gl") return true;
    return u.hostname === "goo.gl" && u.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

/**
 * Pano ID iz `data=` segmenta. `!1s` se javlja više puta — hex ID mjesta
 * (`0x…:0x…`) se preskače, uzima se base64-oliki ID panorame.
 */
function extractPanoId(href: string): string | null {
  const candidates = href.match(/!1s([^!/?&]+)/g) ?? [];
  for (const raw of candidates) {
    const value = decodeURIComponent(raw.slice(3));
    if (value.startsWith("0x")) continue;
    if (value.length < 16) continue;
    if (!/^[A-Za-z0-9_-]+$/.test(value)) continue;
    return value;
  }
  return null;
}

type ViewParams = {
  lat: number;
  lng: number;
  heading: number;
};

/** `@42.29,18.84,3a,75y,187.61h,76.33t` → pozicija kamere i smjer gledanja. */
function extractCameraView(href: string): ViewParams | null {
  const at = href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!at) return null;
  const heading = href.match(/,(\d+(?:\.\d+)?)h/);
  return {
    lat: Number(at[1]),
    lng: Number(at[2]),
    heading: heading ? Number(heading[1]) : 0,
  };
}

/** `!8m2!3d42.29!4d18.84` → tačne koordinate mjesta (precizniji od kamere). */
function extractPlaceCoords(href: string): { lat: number; lng: number } | null {
  const m = href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

function buildPanoEmbedUrl(
  panoId: string,
  lat: number,
  lng: number,
  heading: number,
): string {
  return (
    "https://www.google.com/maps/embed?pb=!4v1!6m8!1m7" +
    `!1s${panoId}!2m2!1d${lat}!2d${lng}!3f${heading}!4f0!5f${EMBED_FOV}`
  );
}

function buildCoordsEmbedUrl(lat: number, lng: number, heading: number): string {
  return (
    "https://www.google.com/maps?q=&layer=c" +
    `&cbll=${lat},${lng}&cbp=11,${heading},0,0,0&output=svembed`
  );
}

function isAlreadyEmbeddable(u: URL): boolean {
  if (u.searchParams.get("output") === "svembed") return true;
  return u.pathname.startsWith("/maps/embed");
}

/**
 * Sinhrono (bez mreže). Google Maps link → embed URL; ostali provajderi
 * (Matterport, Kuula…) prolaze nepromijenjeni. Kratki linkovi vraćaju null.
 */
export function normalizeVirtualTourEmbedUrl(
  raw: string | null | undefined,
): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;

    if (isGoogleMapsShortLink(value)) return null;

    if (!isGoogleMapsHost(u.hostname)) return u.toString();
    if (isAlreadyEmbeddable(u)) return u.toString();

    const href = decodeURIComponent(u.href);
    const camera = extractCameraView(href);
    const panoId = extractPanoId(href);

    if (panoId) {
      const place = extractPlaceCoords(href) ?? camera;
      if (place) {
        return buildPanoEmbedUrl(
          panoId,
          place.lat,
          place.lng,
          camera?.heading ?? 0,
        );
      }
    }

    if (camera) {
      return buildCoordsEmbedUrl(camera.lat, camera.lng, camera.heading);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Razriješi kratki Google link (jedan redirect) pa normalizuj.
 * Koristi se u admin Server Action-u da se u bazu upiše embed-ready URL.
 */
export async function resolveVirtualTourEmbedUrl(
  raw: string | null | undefined,
): Promise<string | null> {
  const value = raw?.trim();
  if (!value) return null;

  if (!isGoogleMapsShortLink(value)) {
    return normalizeVirtualTourEmbedUrl(value);
  }

  try {
    const res = await fetch(value, { redirect: "manual" });
    const location = res.headers.get("location");
    if (!location) return null;
    return normalizeVirtualTourEmbedUrl(location);
  } catch {
    return null;
  }
}
