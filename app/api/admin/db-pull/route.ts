/**
 * Export sadržajnih tabela sa produkcije.
 * GET /api/admin/db-pull?secret=XXX
 */
import { exportContentSql } from "@/lib/content-db-sync";
import { CONTENT_SYNC_SECRET } from "@/lib/content-sync-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== CONTENT_SYNC_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sql = await exportContentSql();
  return new Response(sql, {
    headers: {
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="hrc-content-${new Date().toISOString().slice(0, 10)}.sql"`,
    },
  });
}
