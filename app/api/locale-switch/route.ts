import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import {
  resolveLocaleSwitchHref,
  sanitizeLocaleSwitchPath,
} from "@/lib/locale-switch-resolve";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  const path = req.nextUrl.searchParams.get("path") ?? "";

  if (!to || !isLocale(to)) {
    return NextResponse.json({ error: "Neispravan jezik." }, { status: 400 });
  }

  const sanitized = sanitizeLocaleSwitchPath(path);
  if (!sanitized) {
    return NextResponse.json({ href: `/${to}` });
  }

  const href = await resolveLocaleSwitchHref(sanitized, to as Locale);
  return NextResponse.json({ href });
}
