import { createConnection } from "mysql2/promise";

import { getDatabaseUrl } from "@/lib/database-url";

/** Sadržajne tabele — blog, stranice, meni, media. Bez korisnika i sesija. */
export const CONTENT_TABLES = [
  { name: "site_globals" },
  { name: "site_locale_strings" },
  { name: "nav_links" },
  { name: "nav_link_translations" },
  { name: "site_pages" },
  { name: "site_page_translations" },
  { name: "media" },
  { name: "media_alt_translations" },
  { name: "posts" },
  { name: "post_translations" },
  { name: "home_service_cards" },
  { name: "home_service_card_translations" },
  { name: "home_team_highlights" },
  { name: "home_team_highlight_translations" },
] as const;

export const CONTENT_TABLE_NAMES: string[] = CONTENT_TABLES.map((t) => t.name);

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

/** Export svih sadržajnih tabela u SQL string (prava MySQL imena kolona). */
export async function exportContentSql(): Promise<string> {
  const url = getDatabaseUrl();
  const u = new URL(url);
  const conn = await createConnection({
    host: u.hostname,
    port: parseInt(u.port || "3306", 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  });

  const lines: string[] = [
    "-- HRC — sadržajne tabele",
    `-- ${new Date().toISOString()}`,
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;\n",
  ];

  try {
    for (const { name } of CONTENT_TABLES) {
      const [rows] = await conn.query(`SELECT * FROM \`${name}\``);
      const list = rows as Record<string, unknown>[];
      lines.push(`-- ${name} (${list.length})`);
      lines.push(`DELETE FROM \`${name}\`;`);
      lines.push(rowsToSql(name, list));
    }
  } finally {
    await conn.end();
  }

  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  return lines.join("\n");
}
