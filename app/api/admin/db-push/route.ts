/**
 * Import sadržajnih tabela sa lokala na produkciju.
 * POST /api/admin/db-push?secret=XXX  (body = SQL iz exportContentSql)
 */
import { createConnection } from "mysql2/promise";

import { CONTENT_TABLE_NAMES } from "@/lib/content-db-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDbUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL nije podešen.");
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306", 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

/** Dozvoli samo DELETE/INSERT/SET na poznatim sadržajnim tabelama. */
function assertSafeSql(sql: string) {
  const forbidden =
    /\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|users|auth_sessions|password)\b/i;
  if (forbidden.test(sql)) {
    throw new Error("SQL sadrži zabranjene naredbe.");
  }
  const tables = [...sql.matchAll(/(?:DELETE FROM|INSERT INTO)\s+`([^`]+)`/gi)].map(
    (m) => m[1]!.toLowerCase(),
  );
  for (const t of tables) {
    if (!CONTENT_TABLE_NAMES.includes(t)) {
      throw new Error(`Nepoznata tabela: ${t}`);
    }
  }
}

export async function POST(req: Request) {
  const secret = process.env.DB_PULL_SECRET?.trim();
  if (!secret || secret.length < 16) {
    return new Response("DB_PULL_SECRET nije podešen.", { status: 503 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sql = await req.text();
  if (!sql.trim()) {
    return new Response("Prazan SQL.", { status: 400 });
  }

  try {
    assertSafeSql(sql);
    const conn = await createConnection({
      ...parseDbUrl(),
      multipleStatements: true,
    });
    try {
      await conn.query(sql);
    } finally {
      await conn.end();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
