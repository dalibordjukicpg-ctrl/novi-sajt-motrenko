/**
 * Ograničenje frekvencije za chat (in-memory, po instanci servera) — kao lib/contact-rate-limit.ts.
 */

type Bucket = { count: number; resetAt: number };

function limiter(windowMs: number, max: number) {
  const buckets = new Map<string, Bucket>();
  return (ip: string): boolean => {
    const now = Date.now();
    const key = ip.slice(0, 128) || "unknown";
    const existing = buckets.get(key);
    if (!existing || now > existing.resetAt) {
      if (buckets.size > 5000) buckets.clear();
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (existing.count >= max) return false;
    existing.count += 1;
    return true;
  };
}

/** 30 pitanja u minuti po IP. */
export const allowChatbotQuestion = limiter(60_000, 30);

/** 3 poruke osoblju u 10 minuta po IP. */
export const allowChatbotHandoff = limiter(10 * 60_000, 3);
