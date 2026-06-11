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

/** Sadržajne tabele — blog, stranice, meni, media. Bez korisnika i sesija. */
export const CONTENT_TABLES = [
  { name: "site_globals", table: siteGlobals },
  { name: "site_locale_strings", table: siteLocaleStrings },
  { name: "nav_links", table: navLinks },
  { name: "nav_link_translations", table: navLinkTranslations },
  { name: "site_pages", table: sitePages },
  { name: "site_page_translations", table: sitePageTranslations },
  { name: "media", table: media },
  { name: "media_alt_translations", table: mediaAltTranslations },
  { name: "posts", table: posts },
  { name: "post_translations", table: postTranslations },
  { name: "home_service_cards", table: homeServiceCards },
  { name: "home_service_card_translations", table: homeServiceCardTranslations },
  { name: "home_team_highlights", table: homeTeamHighlights },
  { name: "home_team_highlight_translations", table: homeTeamHighlightTranslations },
] as const;

export const CONTENT_TABLE_NAMES = CONTENT_TABLES.map((t) => t.name);

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
  if (rows.length === 0) return `-- ${tableName}: prazno\n`;
  const cols = Object.keys(rows[0]!).map((c) => `\`${c}\``).join(", ");
  const values = rows
    .map((r) => `(${Object.values(r).map(escapeValue).join(", ")})`)
    .join(",\n  ");
  return `INSERT INTO \`${tableName}\` (${cols}) VALUES\n  ${values};\n`;
}

/** Export svih sadržajnih tabela u SQL string. */
export async function exportContentSql(): Promise<string> {
  const lines: string[] = [
    "-- HRC — sadržajne tabele",
    `-- ${new Date().toISOString()}`,
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;\n",
  ];

  for (const { name, table } of CONTENT_TABLES) {
    // @ts-expect-error drizzle dinamički select
    const rows = (await db.select().from(table)) as Record<string, unknown>[];
    lines.push(`-- ${name} (${rows.length})`);
    lines.push(`DELETE FROM \`${name}\`;`);
    lines.push(rowsToSql(name, rows));
  }

  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  return lines.join("\n");
}
