/** Ograničenje za javni /api/analytics/collect (po IP). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 240;

export function allowAnalyticsCollect(ip: string): boolean {
  const now = Date.now();
  const key = ip.slice(0, 128) || "unknown";
  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_REQUESTS) return false;
  existing.count += 1;
  return true;
}
