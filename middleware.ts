import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ADMIN_BASE_PATH,
  isAdminBasePathPrefix,
  isPublicAdminSubpath,
  toInternalAdminPath,
} from "@/lib/admin-base-path";
import {
  isLikelyValidOtpPendingCookieShape,
  isLikelyValidSessionCookieShape,
  OTP_PENDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { resolveLegacyWordPressRedirect } from "@/lib/legacy-wordpress-redirects";
import { isPreviewHost } from "@/lib/site-url";

/**
 * Edge sloj:
 *   1) Direktan `/admin*` URL više nije dostupan — vraćamo 404 (skriva postojanje admina).
 *   2) Javna admin baza je iz env-a (`ADMIN_BASE_PATH`, default `/hrc-panel-74x`).
 *      Sve unutar te baze se interno rewrite-uje u `/admin/...` da postojeća struktura
 *      `app/admin/...` ne mora da se preimenuje.
 *   3) Brza provjera oblika cookie-a (bez baze) za zaštićene admin podrute.
 *      Puna autorizacija je u server komponentama i server akcijama.
 *   4) Sve admin odgovore dodatno označavamo `X-Robots-Tag: noindex` (sigurnosna mreža
 *      pored `robots: noindex` u metadata-i).
 */

function notFoundResponse(): NextResponse {
  // Što neutralniji 404 — bez ikakvog signala da admin postoji.
  return new NextResponse(null, { status: 404 });
}

function withNoIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

function withPreviewNoIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  // Preview domen (hostingersite.com) — ne indeksirati u pretraživačima
  if (isPreviewHost(host)) {
    return withPreviewNoIndex(NextResponse.next());
  }

  // Stari WordPress URL-ovi → 301 (radi i u dev, i kad je .next „prljava“)
  const legacyTarget = resolveLegacyWordPressRedirect(pathname);
  if (legacyTarget) {
    const url = new URL(legacyTarget, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 301);
  }

  // ── 1) Blokiraj direktan /admin* pristup ────────────────────────────────────
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return notFoundResponse();
  }

  // ── 2) /api/admin/* — zahtijeva validnu sesiju (cookie shape) ──────────────
  if (pathname.startsWith("/api/admin/")) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!isLikelyValidSessionCookieShape(cookie)) {
      return NextResponse.json(
        { error: "Niste prijavljeni." },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // ── 3) Javna admin baza (npr. /hrc-panel-74x/*) ────────────────────────────
  if (isAdminBasePathPrefix(pathname)) {
    const internal = toInternalAdminPath(pathname);

    // Login / forgot / reset — javno (rewrite, bez sesije)
    if (isPublicAdminSubpath(internal)) {
      const url = request.nextUrl.clone();
      url.pathname = internal;
      return withNoIndex(NextResponse.rewrite(url));
    }

    // Sve ostalo unutar admin zone zahtijeva validnu sesiju
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!isLikelyValidSessionCookieShape(cookie)) {
      const pendingOtp = request.cookies.get(OTP_PENDING_COOKIE_NAME)?.value;
      if (isLikelyValidOtpPendingCookieShape(pendingOtp)) {
        const url = request.nextUrl.clone();
        url.pathname = `${ADMIN_BASE_PATH}/verify-otp`;
        return withNoIndex(NextResponse.redirect(url));
      }

      const url = request.nextUrl.clone();
      url.pathname = `${ADMIN_BASE_PATH}/login`;
      // `next` zadržavamo kao javni URL (sa novom bazom), ne interni /admin
      url.searchParams.set("next", pathname + (request.nextUrl.search || ""));
      return withNoIndex(NextResponse.redirect(url));
    }

    const url = request.nextUrl.clone();
    url.pathname = internal;
    return withNoIndex(NextResponse.rewrite(url));
  }

  return NextResponse.next();
}

/**
 * Matcher — uključujemo:
 *   • `/admin/:path*` (za 404 blokadu starog URL-a)
 *   • `/api/admin/:path*`
 *   • catch-all (zbog dinamičke admin baze iz env-a)
 *
 * Catch-all je neophodan jer Next.js matcher mora biti statičan u vrijeme builda
 * a ADMIN_BASE_PATH može biti različit. Filtriramo statičke fajlove unutar funkcije.
 */
export const config = {
  matcher: [
    /*
     * Sve rute osim:
     *   - _next/static, _next/image
     *   - favicon, robots, sitemap, manifest
     *   - statičkih fajlova sa ekstenzijom (.png, .svg, .css, .js, ...)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\..*).*)",
  ],
};
