import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  isLikelyValidSessionCookieShape,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";

const PUBLIC_ADMIN_PREFIXES = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/admin/verify-email",
];

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Edge sloj: brza provjera oblika cookie-a (bez baze).
 * Puna autorizacija je u server komponentama i server akcijama.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (isPublicAdminPath(pathname)) {
      return NextResponse.next();
    }
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!isLikelyValidSessionCookieShape(cookie)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!isLikelyValidSessionCookieShape(cookie)) {
      return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
