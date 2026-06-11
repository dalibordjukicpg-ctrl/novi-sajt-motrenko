/**
 * Bezbijedan export sadržajnih tabela (bez usera/sesija/lozinki).
 * Zaštićen DB_PULL_SECRET iz env.
 *
 * GET /api/admin/db-pull?secret=XXX  → vraća .sql fajl
 *
 * Lokalni import: npm run db:pull
 */
import { db } from "@/lib/db";
import {
  homeServiceCardTranslations,
  homeServiceCards,
  homeTeamHighlightTranslations,
  homeTeamHighlights,
  media,
  mediaAltTranslations,
  navLinkTranslations,
  navLinks,
  postTranslations,
  posts,
  siteGlobals,
  siteLocaleStrings,
  sitePageTranslations,
  sitePages,
} from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TABLES = [
  { name: "site_globals",                    table: siteGlobals },
  { name: "site_locale_strings",             table: siteLocaleStrings },
  { name: "nav_links",                       table: navLinks },
  { name: "nav_link_translations",           table: navLinkTranslations },
  { name: "site_pages",                      table: sitePages },
  { name: "site_page_translations",          table: sitePageTranslations },
  { name: "media",                           table: media },
  { name: "media_alt_translations",          table: mediaAltTranslations },
  { name: "posts",                           table: posts },
  { name: "post_translations",               table: postTranslations },
  { name: "home_service_cards",              table: homeServiceCards },
  { name: "home_service_card_translations",  table: homeServiceCardTranslations },
  { name: "home_team_highlights",            table: homeTeamHighlights },
  { name: "home_team_highlight_translations",table: homeTeamHighlightTranslations },
] as const;

function escapeValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) {
    return `'${v.toISOString().slice(0, 23).replace("T", " ")}'`;
  }
  const s = String(v);
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
}

function rowsToSql(tableName: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return `-- ${tableName}: nema podataka\n`;
  const cols = Object.keys(rows[0]!).map((c) => `\`${c}\``).join(", ");
  const values = rows
    .map((r) => `(${Object.values(r).map(escapeValue).join(", ")})`)
    .join(",\n  ");
  return `INSERT INTO \`${tableName}\` (${cols}) VALUES\n  ${values};\n`;
}

export async function GET(req: Request) {
  const secret = process.env.DB_PULL_SECRET?.trim();
  if (!secret || secret.length < 16) {
    return new Response("DB_PULL_SECRET nije podešen (min 16 znakova).", { status: 503 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const lines: string[] = [
    "-- HRC Motrenko — export sadržajnih tabela",
    `-- Generisano: ${new Date().toISOString()}`,
    "-- NAPOMENA: ne sadrži korisnike, sesije, niti lozinke.\n",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;\n",
  ];

  for (const { name, table } of CONTENT_TABLES) {
    try {
      // @ts-expect-error drizzle select na dinamičkoj tabeli
      const rows = await db.select().from(table) as Record<string, unknown>[];
      lines.push(`-- tabela: ${name} (${rows.length} redova)`);
      lines.push(`DELETE FROM \`${name}\`;`);
      lines.push(rowsToSql(name, rows));
    } catch (e) {
      lines.push(`-- GREŠKA pri exportu ${name}: ${(e as Error).message}\n`);
    }
  }

  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  const sql = lines.join("\n");

  return new Response(sql, {
    headers: {
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="hrc-content-${new Date().toISOString().slice(0, 10)}.sql"`,
    },
  });
}
