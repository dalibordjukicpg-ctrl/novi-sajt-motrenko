/**
 * Jednokratno / idempotentno dodavanje schemama koje Hostinger start
 * ponekad propusti. Samo CONTENT_SYNC_SECRET.
 *
 * GET/POST /api/sync/ensure-schema?secret=…
 */
import { createConnection } from "mysql2/promise";

import { getContentSyncSecret } from "@/lib/content-sync-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkSecret(req: Request): boolean {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret) return false;
  try {
    return secret === getContentSyncSecret();
  } catch {
    return false;
  }
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

async function columnExists(
  conn: Awaited<ReturnType<typeof createConnection>>,
  table: string,
  column: string,
): Promise<boolean> {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column],
  );
  return (rows as { ok: number }[]).length > 0;
}

async function ensurePostsTeamRole(
  conn: Awaited<ReturnType<typeof createConnection>>,
): Promise<string> {
  if (await columnExists(conn, "posts", "team_role")) {
    return "posts.team_role already exists";
  }

  await conn.query(
    "ALTER TABLE `posts` ADD `team_role` enum('doctor','embryologist','nurse')",
  );

  await conn.query(`
    UPDATE \`posts\` p
    INNER JOIN \`post_translations\` t ON t.\`post_id\` = p.\`id\` AND t.\`locale\` = 'me'
    SET p.\`team_role\` = CASE
      WHEN LOWER(t.\`title\`) LIKE 'dr %'
        OR LOWER(t.\`title\`) LIKE 'dr.%'
        OR LOWER(t.\`title\`) LIKE 'doktor%'
        OR LOWER(t.\`title\`) LIKE 'doktorka%'
        OR LOWER(t.\`title\`) LIKE 'mr sci dr%'
        OR LOWER(t.\`title\`) LIKE 'mr. sci. dr%'
        OR LOWER(t.\`title\`) LIKE 'mr dr%'
        OR LOWER(t.\`title\`) LIKE 'mr. dr%'
        OR LOWER(t.\`title\`) LIKE 'prim%dr%'
        THEN 'doctor'
      WHEN LOWER(t.\`title\`) LIKE '%embriolog%' THEN 'embryologist'
      WHEN LOWER(t.\`title\`) LIKE '%sestr%'
        OR LOWER(t.\`title\`) LIKE '%tehničar%'
        OR LOWER(t.\`title\`) LIKE '%tehnicar%'
        OR LOWER(t.\`title\`) LIKE '%koordinator%'
        THEN 'nurse'
      ELSE NULL
    END
    WHERE p.\`content_role\` = 'team' AND p.\`team_role\` IS NULL
  `);

  return "posts.team_role added + backfill";
}

async function handle(req: Request) {
  if (!checkSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conn = await createConnection(parseDbUrl());
  try {
    const teamRole = await ensurePostsTeamRole(conn);
    return Response.json({ ok: true, results: { teamRole } });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  } finally {
    await conn.end();
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
