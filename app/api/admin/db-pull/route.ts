/**
 * Export sadržajnih tabela sa produkcije.
 * GET /api/admin/db-pull?secret=XXX
 */
import { exportContentSql } from "@/lib/content-db-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.DB_PULL_SECRET?.trim();
  if (!secret || secret.length < 16) {
    return new Response("DB_PULL_SECRET nije podešen (min 16 znakova).", { status: 503 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== secret) {
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
