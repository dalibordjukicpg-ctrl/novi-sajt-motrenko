export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Da Hostinger/load balancer vidi da Node proces živi (bez baze). */
export async function GET() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}
