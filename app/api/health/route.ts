import { getDatabaseConfigSnapshot } from "@/lib/database-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Brza provjera da Node proces radi (bez obaveznog DB). */
export async function GET() {
  const config = getDatabaseConfigSnapshot();
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    dbConfigured:
      config.resolvedFrom === "DATABASE_URL" || config.resolvedFrom === "MYSQL_ENV",
    dbParseNote: config.parseNote,
  });
}
