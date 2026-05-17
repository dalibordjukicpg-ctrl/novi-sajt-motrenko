import { headers } from "next/headers";

/** Prvi hop u X-Forwarded-For ili X-Real-Ip (pouzdano samo iza pouzdanog reverse proxy-ja). */
export function getClientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    h.get("cf-connecting-ip")?.trim() ??
    "";
  return ip.slice(0, 128) || "unknown";
}

export async function getRequestClientIp(): Promise<string> {
  const h = await headers();
  return getClientIpFromHeaders(h);
}
