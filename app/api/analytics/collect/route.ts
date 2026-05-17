import geoip from "geoip-lite";
import { userAgent } from "next/server";
import { z } from "zod";

import { allowAnalyticsCollect } from "@/lib/analytics/collect-rate-limit";
import { recordPublicVisit } from "@/lib/analytics/record-public-visit";

export const runtime = "nodejs";

const bodySchema = z.object({
  path: z.string().min(1).max(2048),
  /** Dozvoljava samo http(s); ostalo → null da cijeli hit ne padne na 400. */
  referrer: z
    .string()
    .max(2048)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      if (!t) return null;
      return /^https?:\/\//i.test(t) ? t : null;
    }),
});

async function readCollectBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  return request.headers.get("x-real-ip")?.trim().slice(0, 45) ?? "";
}

function lookupGeo(ip: string) {
  if (
    !ip ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("::ffff:127.")
  ) {
    return {
      country: null as string | null,
      region: null as string | null,
      city: null as string | null,
    };
  }
  const g = geoip.lookup(ip);
  if (!g) {
    return { country: null, region: null, city: null };
  }
  return {
    country: g.country ?? null,
    region: g.region ?? null,
    city: g.city ?? null,
  };
}

function isPathOk(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.includes("..")) return false;
  if (path.includes("\0")) return false;
  return true;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!allowAnalyticsCollect(ip)) {
    return new Response(null, { status: 429 });
  }

  let json: unknown;
  try {
    json = await readCollectBody(request);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (json === null || typeof json !== "object") {
    return new Response(null, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(null, { status: 400 });
  }

  const path = parsed.data.path.trim();
  if (!isPathOk(path)) {
    return new Response(null, { status: 400 });
  }

  const ua = userAgent({ headers: request.headers });
  const geo = lookupGeo(ip);

  try {
    await recordPublicVisit({
      path,
      referrer: parsed.data.referrer,
      ip: ip || "unknown",
      userAgentHeader: request.headers.get("user-agent"),
      parsedUa: ua,
      geo,
    });
  } catch (e) {
    console.error("[analytics collect]", e);
    return new Response(null, { status: 500 });
  }

  return Response.json({ ok: true });
}
