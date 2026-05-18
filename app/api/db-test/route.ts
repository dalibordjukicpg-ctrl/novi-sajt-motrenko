import mysql from "mysql2/promise";

import {
  getDatabaseConfigSnapshot,
  getDatabaseUrl,
} from "@/lib/database-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Privremena dijagnostika (Hostinger): u env postavi ALLOW_DB_CONNECTION_TEST=1,
 * otvori GET /api/db-test, pa ukloni env (ruta inače vraća 404).
 * Nikad ne šalje lozinku ili puni connection string.
 */
export async function GET() {
  if (process.env.ALLOW_DB_CONNECTION_TEST !== "1") {
    return new Response(null, { status: 404 });
  }

  const config = getDatabaseConfigSnapshot();
  const started = Date.now();

  let url: string;
  try {
    url = getDatabaseUrl();
  } catch (e) {
    return Response.json(
      {
        ok: false,
        latencyMs: Date.now() - started,
        config,
        error: { message: (e as Error).message },
      },
      { status: 503 },
    );
  }

  if (config.parseNote) {
    return Response.json(
      {
        ok: false,
        latencyMs: Date.now() - started,
        config,
        error: { message: config.parseNote },
      },
      { status: 503 },
    );
  }

  let conn: mysql.Connection | undefined;
  try {
    conn = await mysql.createConnection({
      uri: url,
      charset: "utf8mb4",
      connectTimeout: 12_000,
    });
    await conn.query("SELECT 1 AS health");
    const [rows] = await conn.query("SHOW TABLES");
    await conn.end();
    conn = undefined;

    const tableCount = Array.isArray(rows) ? rows.length : 0;

    return Response.json({
      ok: true,
      latencyMs: Date.now() - started,
      config,
      connected: true,
      tableCount,
      hint:
        tableCount === 0
          ? "Baza ima 0 tabela — import ili npm run db:migrate nije primijenjen na ovu šemu."
          : null,
    });
  } catch (e) {
    if (conn) {
      try {
        await conn.end();
      } catch {
        /* */
      }
    }
    const err = e as {
      code?: string;
      errno?: number;
      sqlMessage?: string;
      message?: string;
    };
    return Response.json(
      {
        ok: false,
        latencyMs: Date.now() - started,
        config,
        connected: false,
        error: {
          code: err.code ?? null,
          errno: err.errno ?? null,
          sqlMessage: err.sqlMessage?.slice(0, 500) ?? null,
        },
      },
      { status: 503 },
    );
  }
}
