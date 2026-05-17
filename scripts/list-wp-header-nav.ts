/**
 * Ispis glavnog WordPress header menija iz izvorne WP MySQL baze (živo čitanje).
 * Logika ciljeva i naslova usklađena sa `scripts/import-wordpress.ts`.
 *
 *   npm run wp:list-header
 *
 * Zahtijeva: WP_DATABASE_URL ili WP_MYSQL_USER + WP_MYSQL_PASSWORD + WP_MYSQL_DATABASE
 * Opciono: WP_TABLE_PREFIX (default wp_), WP_PRIMARY_MENU_TERM_TAXONOMY_ID (default 138)
 */
import "./load-dotenv";

import type { RowDataPacket } from "mysql2";

import { createMysqlPoolUtf8mb4 } from "../lib/create-mysql-pool";
import { getDatabaseUrl, getWpSourceDatabaseUrl } from "../lib/database-url";

function resolveWpConnectionUri(): { uri: string; source: "WP_*" | "DATABASE_URL" } {
  try {
    return { uri: getWpSourceDatabaseUrl(), source: "WP_*" };
  } catch {
    return { uri: getDatabaseUrl(), source: "DATABASE_URL" };
  }
}

const PRIMARY_MENU_TT = Number.parseInt(
  process.env.WP_PRIMARY_MENU_TERM_TAXONOMY_ID || "138",
  10,
);

/** Isto kao u import-wordpress.ts (humanrep dump). */
const WP_CAT_NOVOSTI_TT = Number.parseInt(
  process.env.WP_CAT_NOVOSTI_TERM_TAXONOMY_ID || "1",
  10,
);
const WP_CAT_OSOBLJE_TT = Number.parseInt(
  process.env.WP_CAT_OSOBLJE_TERM_TAXONOMY_ID || "152",
  10,
);

type WpPostLite = {
  ID: number;
  post_title: string;
  post_name: string;
  post_status: string;
  post_type: string;
  menu_order: number;
};

function qTable(prefix: string, name: string): string {
  return `\`${prefix}${name}\``;
}

function normalizeLabel(raw: string): string {
  return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

type MenuItem = {
  wpId: number;
  title: string;
  href: string;
  sortOrder: number;
  parentWp: number;
};

function menuItemTitle(
  nav: WpPostLite,
  meta: Record<string, string>,
  postsById: Map<number, WpPostLite>,
  termsById: Map<number, { name: string }>,
): string {
  const own = normalizeLabel(nav.post_title);
  if (own && !/^\d+$/.test(own)) return own;
  const slugTit = normalizeLabel(nav.post_name);
  if (slugTit && !/^\d+$/.test(slugTit)) return slugTit;

  if (meta._menu_item_type === "taxonomy" && meta._menu_item_object === "category") {
    const termId = Number.parseInt(meta._menu_item_object_id || "0", 10);
    const t = termsById.get(termId);
    if (t?.name) return normalizeLabel(t.name);
  }

  const oid = Number.parseInt(meta._menu_item_object_id || "0", 10);
  const tgt = postsById.get(oid);
  if (tgt) {
    const tt = normalizeLabel(tgt.post_title);
    if (tt) return tt;
    const ts = normalizeLabel(tgt.post_name);
    if (ts && !/^\d+$/.test(ts)) return ts;
  }
  return "Link";
}

function pathToInternalHref(
  pathname: string,
  postsById: Map<number, WpPostLite>,
): string {
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  const first = segments[0] ?? "";
  if (segments.length === 1) {
    for (const p of postsById.values()) {
      if (p.post_type === "page" && p.post_status === "publish" && p.post_name === first) {
        return first === "naslovna" ? "/" : `/s/${first}`;
      }
    }
    for (const p of postsById.values()) {
      if (p.post_type === "post" && p.post_status === "publish" && p.post_name === first) {
        return `/posts/${first}`;
      }
    }
  }
  if (segments.length === 1) return `/s/${first}`;
  return "/";
}

function resolveMenuHref(
  meta: Record<string, string>,
  postsById: Map<number, WpPostLite>,
  termTaxonomyByTermId: Map<number, number>,
): string {
  const type = meta._menu_item_type ?? "";
  const object = meta._menu_item_object ?? "";

  if (type === "taxonomy" && object === "category") {
    const termId = Number.parseInt(meta._menu_item_object_id || "0", 10);
    const ttId = termTaxonomyByTermId.get(termId);
    if (ttId === WP_CAT_NOVOSTI_TT) return "#novosti";
    if (ttId === WP_CAT_OSOBLJE_TT) return "/s/tim";
    return `#novosti (kategorija term_id=${termId}, term_taxonomy_id=${ttId ?? "?"})`;
  }

  const customUrl = (meta._menu_item_url ?? "").trim();
  if (type === "custom" && customUrl.length > 0) {
    try {
      const u = new URL(customUrl);
      const host = u.hostname.replace(/^www\./, "");
      if (
        host === "humanreproduction.com" ||
        host.endsWith("humanreproduction.com")
      ) {
        return pathToInternalHref(`${u.pathname}${u.search}${u.hash}`, postsById);
      }
      return customUrl;
    } catch {
      return customUrl;
    }
  }

  const oid = Number.parseInt(meta._menu_item_object_id || "0", 10);
  const target = postsById.get(oid);
  if (!target) return "# (nepoznat objekt)";

  if (target.post_type === "post") {
    const slug = target.post_name.trim();
    return slug ? `/posts/${slug}` : "#";
  }

  if (target.post_type === "page") {
    const slug = target.post_name.trim();
    if (!slug) return "#";
    if (slug === "naslovna") return "/";
    return `/s/${slug}`;
  }

  return "#";
}

async function main(): Promise<void> {
  const prefix = (process.env.WP_TABLE_PREFIX ?? "wp_").replace(/[^a-z0-9_]/gi, "");

  const { uri: wpUrl, source: credSource } = resolveWpConnectionUri();
  const pool = createMysqlPoolUtf8mb4(wpUrl);

  if (credSource === "DATABASE_URL") {
    console.log(
      "(Nema WP_DATABASE_URL / WP_MYSQL_* — koristim glavni DATABASE_URL. Ako WP nije u ovoj bazi, postavi WP_* u .env.)\n",
    );
  }

  const postsTable = qTable(prefix, "posts");
  const metaTable = qTable(prefix, "postmeta");
  const relTable = qTable(prefix, "term_relationships");
  const ttTable = qTable(prefix, "term_taxonomy");
  const termsTable = qTable(prefix, "terms");

  const [menuRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       tt.term_taxonomy_id AS tt_id,
       t.name AS menu_name,
       t.slug AS menu_slug,
       COUNT(DISTINCT tr.object_id) AS link_count
     FROM ${ttTable} tt
     INNER JOIN ${termsTable} t ON t.term_id = tt.term_id
     LEFT JOIN ${relTable} tr ON tr.term_taxonomy_id = tt.term_taxonomy_id
     WHERE tt.taxonomy = 'nav_menu'
     GROUP BY tt.term_taxonomy_id, t.name, t.slug
     ORDER BY t.name ASC`,
  );

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  WordPress — svi navigacioni meniji (taxonomy = nav_menu)");
  console.log("═══════════════════════════════════════════════════════════\n");

  for (const m of menuRows as { tt_id: number; menu_name: string; menu_slug: string; link_count: number }[]) {
    const ttId = Number(m.tt_id);
    const mark = ttId === PRIMARY_MENU_TT ? "  ← PRIMARY (WP_PRIMARY_MENU_TERM_TAXONOMY_ID)" : "";
    console.log(
      `  • term_taxonomy_id=${ttId}  ${m.menu_name}  [${m.menu_slug}]  (${Number(m.link_count)} veza u term_relationships)${mark}`,
    );
  }

  const [itemPosts] = await pool.query<WpPostLite[] & RowDataPacket[]>(
    `SELECT p.ID, p.post_title, p.post_name, p.post_status, p.post_type, p.menu_order
     FROM ${postsTable} p
     INNER JOIN ${relTable} tr
       ON tr.object_id = p.ID AND tr.term_taxonomy_id = ?
     WHERE p.post_type = 'nav_menu_item' AND p.post_status = 'publish'
     ORDER BY p.menu_order ASC, p.ID ASC`,
    [PRIMARY_MENU_TT],
  );

  console.log("\n───────────────────────────────────────────────────────────");
  console.log(`  HEADER meni: term_taxonomy_id = ${PRIMARY_MENU_TT}`);
  console.log("───────────────────────────────────────────────────────────\n");

  if (itemPosts.length === 0) {
    console.log(
      "  (prazno) Nema publish stavki tipa nav_menu_item za ovaj meni.\n  Provjeri WP_PRIMARY_MENU_TERM_TAXONOMY_ID ili odaberi drugi tt_id iz spiska iznad.\n",
    );
    await pool.end();
    return;
  }

  const ids = itemPosts.map((p) => Number(p.ID));
  const ph = ids.map(() => "?").join(",");

  const [metaRows] = await pool.query<RowDataPacket[]>(
    `SELECT post_id, meta_key, meta_value FROM ${metaTable} WHERE post_id IN (${ph})`,
    ids,
  );

  const metaByPost = new Map<number, Record<string, string>>();
  for (const row of metaRows as {
    post_id: number;
    meta_key: string;
    meta_value: string;
  }[]) {
    const pid = Number(row.post_id);
    const rec = metaByPost.get(pid) ?? {};
    rec[row.meta_key] = row.meta_value ?? "";
    metaByPost.set(pid, rec);
  }

  const refIds = new Set<number>();
  for (const id of ids) {
    const m = metaByPost.get(id) ?? {};
    const oid = Number.parseInt(m._menu_item_object_id || "0", 10);
    if (oid > 0) refIds.add(oid);
  }

  const postsById = new Map<number, WpPostLite>();
  if (refIds.size > 0) {
    const refList = [...refIds];
    const ph2 = refList.map(() => "?").join(",");
    const [targets] = await pool.query<WpPostLite[] & RowDataPacket[]>(
      `SELECT ID, post_title, post_name, post_status, post_type, menu_order
       FROM ${postsTable} WHERE ID IN (${ph2})`,
      refList,
    );
    for (const t of targets) postsById.set(Number(t.ID), t);
  }

  const [taxRows] = await pool.query<RowDataPacket[]>(
    `SELECT term_id, term_taxonomy_id FROM ${ttTable} WHERE taxonomy = 'category'`,
  );
  const termTaxonomyByTermId = new Map<number, number>();
  for (const tr of taxRows as { term_id: number; term_taxonomy_id: number }[]) {
    termTaxonomyByTermId.set(Number(tr.term_id), Number(tr.term_taxonomy_id));
  }

  const [termNameRows] = await pool.query<RowDataPacket[]>(
    `SELECT term_id, name FROM ${termsTable}`,
  );
  const termsById = new Map<number, { name: string }>();
  for (const t of termNameRows as { term_id: number; name: string }[]) {
    termsById.set(Number(t.term_id), { name: t.name });
  }

  const items: MenuItem[] = [];
  for (const p of itemPosts) {
    const pid = Number(p.ID);
    const meta = metaByPost.get(pid) ?? {};
    const parentRaw = Number.parseInt(meta._menu_item_menu_item_parent || "0", 10);
    items.push({
      wpId: pid,
      title: menuItemTitle(p, meta, postsById, termsById),
      href: resolveMenuHref(meta, postsById, termTaxonomyByTermId),
      sortOrder: Number(p.menu_order),
      parentWp: parentRaw,
    });
  }

  const byParent = new Map<number, MenuItem[]>();
  for (const it of items) {
    if (!it.parentWp) continue;
    const list = byParent.get(it.parentWp) ?? [];
    list.push(it);
    byParent.set(it.parentWp, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) =>
      a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.wpId - b.wpId,
    );
  }

  const roots = items.filter((it) => !it.parentWp);
  roots.sort((a, b) =>
    a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.wpId - b.wpId,
  );

  function printTree(node: MenuItem, depth: number): void {
    const pad = "    ".repeat(depth);
    console.log(`${pad}• ${node.title}`);
    console.log(`${pad}  URL (kao u importu): ${node.href}`);
    console.log(`${pad}  wp_posts.ID stavke menija: ${node.wpId}`);
    const ch = byParent.get(node.wpId) ?? [];
    for (const c of ch) printTree(c, depth + 1);
  }

  for (const r of roots) printTree(r, 0);

  console.log(
    "\n  Napomena: mapiranje kategorija koristi term_taxonomy_id",
    `${WP_CAT_NOVOSTI_TT} → #novosti, ${WP_CAT_OSOBLJE_TT} → /s/tim`,
    "(override: WP_CAT_*_TERM_TAXONOMY_ID u .env).\n",
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
