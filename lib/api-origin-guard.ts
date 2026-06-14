import { PRODUCTION_SITE_URL, getSiteUrl } from "@/lib/site-url";

function normalizeOrigin(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function allowedOrigins(): Set<string> {
  const out = new Set<string>();
  for (const raw of [
    getSiteUrl(),
    PRODUCTION_SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.APP_URL,
    "http://localhost:7392",
    "http://127.0.0.1:7392",
  ]) {
    const o = raw?.trim() ? normalizeOrigin(raw.trim()) : null;
    if (o) out.add(o);
  }
  return out;
}

/** Za POST /api/contact i /api/booking — odbij cross-site zahtjeve bez validnog Origin/Referer. */
export function isAllowedPublicFormOrigin(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const allowed = allowedOrigins();
  const origin = req.headers.get("origin");
  if (origin) {
    const o = normalizeOrigin(origin);
    if (o && allowed.has(o)) return true;
    if (o && /\.(loca\.lt|trycloudflare\.com|ngrok-free\.app)$/i.test(o)) {
      return true;
    }
    return false;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.has(refOrigin)) return true;
    } catch {
      return false;
    }
  }

  return false;
}
