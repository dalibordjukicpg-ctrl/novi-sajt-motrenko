/**
 * Sync CMS sadržaja između lokala i produkcije.
 * GET  ?secret=…  → export SQL (produkcija → lokal)
 * POST ?secret=…  → import SQL (lokal → produkcija)
 */
import { createConnection } from "mysql2/promise";

import { CONTENT_TABLE_NAMES, exportContentSql } from "@/lib/content-db-sync";
import { CONTENT_SYNC_SECRET } from "@/lib/content-sync-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkSecret(req: Request): boolean {
  return new URL(req.url).searchParams.get("secret") === CONTENT_SYNC_SECRET;
}

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

function assertSafeSql(sql: string) {
  for (const line of sql.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;
    if (/^(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i.test(trimmed)) {
      throw new Error("SQL sadrži zabranjene naredbe.");
    }
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

export async function GET(req: Request) {
  if (!checkSecret(req)) {
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

export async function POST(req: Request) {
  if (!checkSecret(req)) {
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
