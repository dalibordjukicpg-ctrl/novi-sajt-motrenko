import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function randomUrlToken(): string {
  return randomBytes(32).toString("hex");
}

export function sha256Hex(input: Buffer | string): string {
  return createHash("sha256")
    .update(input)
    .digest("hex");
}

export function hashOpaqueToken(secretHex: string): string | null {
  if (!/^[0-9a-f]{64}$/i.test(secretHex)) return null;
  return sha256Hex(Buffer.from(secretHex, "hex"));
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a.toLowerCase(), "hex");
    const bb = Buffer.from(b.toLowerCase(), "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
