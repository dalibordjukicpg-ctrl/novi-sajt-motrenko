import { randomUUID } from "crypto";

import { ADMIN_BASE_PATH } from "@/lib/admin-base-path";
import { extractReferrerHost } from "@/lib/analytics/referrer-host";
import { buildVisitorHash } from "@/lib/analytics/visitor-hash";
import { db } from "@/lib/db";
import { analyticsVisits } from "@/lib/db/schema";
import { locales, type Locale } from "@/lib/i18n";

export type RecordPublicVisitInput = {
  path: string;
  referrer: string | null | undefined;
  ip: string;
  userAgentHeader: string | null | undefined;
  parsedUa: {
    isBot: boolean;
    device?: { type?: string | undefined };
    browser?: { name?: string | undefined; major?: string | undefined };
    os?: { name?: string | undefined };
  };
  geo: {
    country: string | null;
    region: string | null;
    city: string | null;
  };
};

function guessLocaleFromPath(pathname: string): string | null {
  const first = pathname.split("/").filter(Boolean)[0];
  if (!first) return null;
  return (locales as readonly string[]).includes(first)
    ? (first as Locale)
    : null;
}

function normalizePath(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("/")) return `/${t}`;
  if (t.length > 2048) return t.slice(0, 2048);
  return t;
}

export async function recordPublicVisit(
  input: RecordPublicVisitInput,
): Promise<void> {
  const path = normalizePath(input.path);
  if (
    path.startsWith("/admin") ||
    path === ADMIN_BASE_PATH ||
    path.startsWith(`${ADMIN_BASE_PATH}/`) ||
    path.startsWith("/api")
  ) {
    return;
  }

  const uaStr = (input.userAgentHeader ?? "").slice(0, 512);
  const visitorHash = buildVisitorHash(input.ip, uaStr);

  let deviceType = "desktop";
  const dt = input.parsedUa.device?.type;
  if (dt === "mobile") deviceType = "mobile";
  else if (dt === "tablet") deviceType = "tablet";
  else if (!dt && uaStr) deviceType = "unknown";

  const browserParts = [
    input.parsedUa.browser?.name,
    input.parsedUa.browser?.major,
  ].filter(Boolean);
  const browser =
    browserParts.length > 0
      ? browserParts.join(" ").slice(0, 80)
      : undefined;

  const osName = input.parsedUa.os?.name?.slice(0, 80) || undefined;

  await db.insert(analyticsVisits).values({
    id: randomUUID(),
    occurredAt: new Date(),
    path,
    locale: guessLocaleFromPath(path),
    referrer: input.referrer ? input.referrer.slice(0, 2048) : null,
    referrerHost: extractReferrerHost(input.referrer),
    countryCode: input.geo.country
      ? input.geo.country.slice(0, 2).toUpperCase()
      : null,
    region: input.geo.region
      ? input.geo.region.slice(0, 128)
      : null,
    city: input.geo.city ? input.geo.city.slice(0, 128) : null,
    deviceType,
    browser: browser ?? null,
    osName: osName ?? null,
    isBot: input.parsedUa.isBot,
    visitorHash,
  });
}
