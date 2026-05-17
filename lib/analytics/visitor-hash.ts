import { createHash } from "crypto";

/**
 * Jedinstvenost posjetilaca (~dnevno): IP + User-Agent + salt (bez čuvanja sirovog IP-a u izvještajima).
 * Postavi ANALYTICS_VISITOR_SALT u produkciji (nasumičan niz).
 */
export function buildVisitorHash(ip: string, userAgent: string): string {
  const salt =
    process.env.ANALYTICS_VISITOR_SALT?.trim() || "change-me-in-production";
  const payload = `${salt}|${ip}|${userAgent.slice(0, 200)}`;
  return createHash("sha256").update(payload).digest("hex");
}
