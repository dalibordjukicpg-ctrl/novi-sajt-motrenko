import "./load-dotenv";

/**
 * Uvoz wp_posts iz MySQL dumpa (.sql). Tekst prolazi kroz isti SSOT sanitizer kao ETL.
 * Unicode: dump čitati kao UTF-8; upis u bazu preko Drizzle `db` koristi mysql2 pool sa utf8mb4.
 *
 * ## Samo header + stranice iz menija
 * Ne briše članke, footer meni, media, site_locale_strings. Briše i ponovo puni **samo**
 * `nav_links` sa `placement = header` i ažurira **site_pages** čiji slug se pojavljuje u href
 * kao `/s/slug` (uključujući podstranice u meniju). Argument `--only-header-and-pages`
 * (ili `IMPORT_WP_ONLY_HEADER_PAGES=1`). Putanju do .sql ostavi kao prvi ne-flag argument.
 */
import { createHash, randomUUID } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve as pathResolve } from "path";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "../lib/db";
import {
  media,
  mediaAltTranslations,
  navLinkTranslations,
  navLinks,
  postTranslations,
  posts,
  siteGlobals,
  siteLocaleStrings,
  sitePages,
  sitePageTranslations,
} from "../lib/db/schema";
import { SITE_GLOBALS_ROW_ID } from "../lib/queries/site-globals";
import type { Locale } from "../lib/i18n";
import { locales } from "../lib/i18n";
import { SITE_STRING_DEFAULTS, SITE_STRING_KEYS } from "../lib/site-fields";
import type { SiteStringKey } from "../lib/site-fields";
import { SQL_NULL, extractInsertTuples } from "./lib/parse-mysql-inserts";
import {
  type SanitizeWordPressContentOptions,
  inferOldSiteOriginFromEnv,
  sanitizeOptionsFromEnv,
  sanitizeWordPressContent,
} from "./lib/sanitize-wordpress-content";
import { textOrNull, titleOrFallback } from "./lib/drizzle-text-helpers";

const PRIMARY_MENU_TT = Number.parseInt(
  process.env.WP_PRIMARY_MENU_TERM_TAXONOMY_ID || "138",
  10,
);

/** Ako je u SQL-u druga lokacija menija za footer widget; npr. theme „footer“ meni. */
const FOOTER_MENU_TT_RAW = process.env.WP_FOOTER_MENU_TERM_TAXONOMY_ID?.trim();
const FOOTER_MENU_TT =
  FOOTER_MENU_TT_RAW !== undefined && FOOTER_MENU_TT_RAW !== ""
    ? Number.parseInt(FOOTER_MENU_TT_RAW, 10)
    : NaN;

/** WP term_taxonomy_id za kategorije u humanrep dumpu */
const WP_CAT_NOVOSTI_TT = 1;
const WP_CAT_OSOBLJE_TT = 152;

type WpPostRow = {
  id: number;
  postContent: string;
  postTitle: string;
  postExcerpt: string;
  postStatus: string;
  postName: string;
  postParent: number;
  guid: string;
  menuOrder: number;
  postType: string;
  postMime: string;
};

type MirroredAsset = { rel: string; size: number; mime: string };

function parseWpPostRow(t: string[]): WpPostRow {
  return {
    id: Number(t[0]),
    postContent: t[4] ?? "",
    postTitle: t[5] ?? "",
    postExcerpt: t[6] ?? "",
    postStatus: t[7] ?? "",
    postName: t[11] ?? "",
    postParent: Number(t[17] ?? 0),
    guid: t[18] ?? "",
    menuOrder: Number(t[19] ?? 0),
    postType: t[20] ?? "",
    postMime: t[21] ?? "",
  };
}

function normSqlString(v: string): string {
  if (v === SQL_NULL) return "";
  return v;
}

function normalizeLabel(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kad WP nema naslov: dijagnostičke-metode-muskarac → čitljiva etiketa.
 * Kratke riječi kao iui, ivf ostaju velikim slovima.
 */
function humanizeSlugSegment(slug: string): string {
  const s = decodeURIComponent(slug).trim();
  if (!s || /^\d+$/.test(s)) return "";
  return s
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower.length <= 4 && /^[a-z]+$/.test(lower)) return lower.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function labelFromInternalHref(href: string): string {
  const h = href.trim();
  const page = h.match(/^\/s\/([^/?#]+)/i);
  if (page?.[1]) return humanizeSlugSegment(page[1]);
  const post = h.match(/^\/posts\/([^/?#]+)/i);
  if (post?.[1]) return humanizeSlugSegment(post[1]);
  return "";
}

function isBadMenuLabel(label: string): boolean {
  const t = normalizeLabel(label);
  return t.length === 0 || /^\d+$/.test(t);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Izvod: ako WP polje post_excerpt postoji — `plain` sanitizacija; inače rezanje iz već
 * sanitizovanog HTML body-ja (kao u `migrate-wordpress-etl.ts`).
 */
function excerptFromSanitizedBody(
  sanitizedBodyHtml: string,
  rawExcerptField: string,
  opts: SanitizeWordPressContentOptions,
): string {
  const sanitizedExcerpt = sanitizeWordPressContent(rawExcerptField, {
    ...opts,
    contentKind: "plain",
  });
  const ex = sanitizedExcerpt.trim();
  if (ex) return ex.replace(/<[^>]+>/g, "").trim();
  const plain = sanitizedBodyHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 400 ? `${plain.slice(0, 397)}…` : plain;
}

function guessMimeFromBuf(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return "application/octet-stream";
}

function humanrepUrlsInHtml(html: string): string[] {
  const found = new Set<string>();
  const re =
    /https?:\/\/(?:www\.)?humanreproduction\.com[^"'\\\s>)]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    found.add(m[0].split("#")[0].split("?")[0]);
  }
  return [...found];
}

function rewriteHumanrepUrls(html: string, assetMap: Map<string, string>): string {
  let out = html;
  const pairs = [...assetMap.entries()].sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [remote, relPath] of pairs) {
    const safe = remote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(safe, "gi"), `/${relPath}`);
  }
  return out;
}

function buildObjectTaxonomies(
  dump: string,
): Map<number, Set<number>> {
  const rows = extractInsertTuples(dump, "wp_term_relationships");
  const m = new Map<number, Set<number>>();
  for (const r of rows) {
    const oid = Number(r[0]);
    const tt = Number(r[1]);
    if (!Number.isFinite(oid) || !Number.isFinite(tt)) continue;
    if (!m.has(oid)) m.set(oid, new Set());
    m.get(oid)!.add(tt);
  }
  return m;
}

function pathToInternalHref(
  pathraw: string,
  postsById: Map<number, WpPostRow>,
): string {
  const path = pathraw.trim();
  if (!path || path === "/") return "/";
  const noHash = path.split("#")[0] ?? "";
  const segments = noHash
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
  const first = segments[0] || "";
  if (!first) return "/";

  for (const p of postsById.values()) {
    if (
      p.postType === "page" &&
      p.postStatus === "publish" &&
      p.postName === first
    ) {
      return `/s/${first}`;
    }
  }
  for (const p of postsById.values()) {
    if (
      p.postType === "post" &&
      p.postStatus === "publish" &&
      p.postName === first
    ) {
      return `/posts/${first}`;
    }
  }
  if (segments.length === 1) return `/s/${first}`;
  return "/";
}

function resolveMenuHref(
  meta: Record<string, string>,
  postsById: Map<number, WpPostRow>,
  termTaxonomyByTermId: Map<number, number>,
): string {
  const type = meta._menu_item_type ?? "";
  const object = meta._menu_item_object ?? "";

  if (type === "taxonomy" && object === "category") {
    const termId = Number.parseInt(meta._menu_item_object_id || "0", 10);
    const ttId = termTaxonomyByTermId.get(termId);
    if (ttId === WP_CAT_NOVOSTI_TT) return "#novosti";
    if (ttId === WP_CAT_OSOBLJE_TT) return "/s/tim";
    return "#novosti";
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
  if (!target) return "#";

  if (target.postType === "post") {
    const slug = target.postName.trim();
    return slug ? `/posts/${slug}` : "#";
  }

  if (target.postType === "page") {
    const slug = target.postName.trim();
    if (!slug) return "#";
    if (slug === "naslovna") return "/";
    return `/s/${slug}`;
  }

  return "#";
}

function menuItemTitle(
  nav: WpPostRow,
  meta: Record<string, string>,
  postsById: Map<number, WpPostRow>,
  termsById: Map<number, { name: string }>,
): string {
  const own = normalizeLabel(nav.postTitle);
  if (own && !/^\d+$/.test(own)) return own;
  const slugTit = normalizeLabel(nav.postName);
  if (slugTit && !/^\d+$/.test(slugTit)) return slugTit;

  if (meta._menu_item_type === "taxonomy" && meta._menu_item_object === "category") {
    const termId = Number.parseInt(meta._menu_item_object_id || "0", 10);
    const t = termsById.get(termId);
    if (t?.name) return normalizeLabel(t.name);
  }

  const oid = Number.parseInt(meta._menu_item_object_id || "0", 10);
  const tgt = postsById.get(oid);
  if (tgt) {
    const tt = normalizeLabel(tgt.postTitle);
    if (tt) return tt;
    const ts = normalizeLabel(tgt.postName);
    if (ts && !/^\d+$/.test(ts)) return ts;
    if (tgt.postName && !/^\d+$/.test(tgt.postName)) {
      const fromSlug = humanizeSlugSegment(tgt.postName);
      if (fromSlug) return fromSlug;
    }
  }
  return "Link";
}

function pickAboutLead(
  postsById: Map<number, WpPostRow>,
  opts: SanitizeWordPressContentOptions,
): string | null {
  for (const p of postsById.values()) {
    if (
      p.postType === "page" &&
      p.postStatus === "publish" &&
      (p.postName === "o-nama" ||
        normalizeLabel(p.postTitle).toLowerCase() === "o nama")
    ) {
      const plain = sanitizeWordPressContent(p.postContent, {
        ...opts,
        contentKind: "plain",
      }).trim();
      if (plain.length > 0) {
        return plain.length > 1200 ? `${plain.slice(0, 1197)}…` : plain;
      }
    }
  }
  return null;
}

function teamListingHtml(
  teamPosts: WpPostRow[],
  opts: SanitizeWordPressContentOptions,
): string {
  const items = [...teamPosts]
    .filter((p) => p.postStatus === "publish")
    .sort((a, b) =>
      normalizeLabel(a.postTitle).localeCompare(
        normalizeLabel(b.postTitle),
        "sr",
      ),
    )
    .map((p) => {
      const title =
        normalizeLabel(
          sanitizeWordPressContent(p.postTitle, { ...opts, contentKind: "plain" }),
        ) || p.postName;
      return `<li><a href="/posts/${escapeHtml(p.postName)}">${escapeHtml(title)}</a></li>`;
    })
    .join("\n");
  return `<section class="tim-pregled"><ul class="list-disc space-y-2 pl-5">${items}</ul></section>`;
}

const PUBLIC_ROOT = pathResolve(process.cwd(), "public");

async function mirrorAsset(
  absoluteUrl: string,
  canonicalMap: Map<string, MirroredAsset>,
  mirrorFailures?: { n: number },
): Promise<void> {
  const key = absoluteUrl.split("?")[0].replace(/\/$/, "");
  if (!key.startsWith("http") || canonicalMap.has(key)) return;

  let buf: Buffer | null = null;
  const tryList = [absoluteUrl, key];
  for (const u of tryList) {
    try {
      const r = await fetch(u, { redirect: "follow" });
      if (!r.ok) continue;
      buf = Buffer.from(await r.arrayBuffer());
      break;
    } catch {
      continue;
    }
  }
  if (!buf || buf.length === 0) {
    console.warn("Preuzimanje nije uspjelo:", key);
    if (mirrorFailures) mirrorFailures.n++;
    return;
  }

  const mime = guessMimeFromBuf(buf);
  const u = new URL(key);
  const base =
    u.pathname.split("/").pop() || "f";
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
  const h = createHash("sha256").update(key).digest("hex").slice(0, 12);
  const rel = join("wp-media", `${h}_${safe}`).replace(/\\/g, "/");

  const fullAbs = join(PUBLIC_ROOT, rel);
  const dir = dirname(fullAbs);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(fullAbs, buf);

  canonicalMap.set(key, { rel, size: buf.length, mime });
}

type MenuItem = {
  wpId: number;
  title: string;
  href: string;
  sortOrder: number;
  parentWp: number;
};

/** Tekst u adminu / headeru: bez praznih i numeričkih „naslova“, uz rezervu iz putanje stranice. */
function navLinkLabelForInsert(
  it: MenuItem,
  sanitizeOpts: SanitizeWordPressContentOptions,
): string {
  const sanitized = normalizeLabel(
    sanitizeWordPressContent(it.title, {
      ...sanitizeOpts,
      contentKind: "plain",
    }),
  );
  let label = titleOrFallback(sanitized, normalizeLabel(it.title));
  if (isBadMenuLabel(label) || label === "Link") {
    const fromHref = labelFromInternalHref(it.href);
    if (fromHref) label = fromHref;
  }
  if (isBadMenuLabel(label)) label = "Link";
  return label.slice(0, 255);
}

/** Slugovi CMS stranica na koje header meni pokazuje (`/s/slug`). */
function collectLinkedPageSlugs(menuItems: MenuItem[]): Set<string> {
  const slugs = new Set<string>();
  for (const it of menuItems) {
    const h = it.href.trim();
    const m = h.match(/^\/s\/([^/?#]+)/i);
    if (!m?.[1]) continue;
    const slug = m[1].trim();
    if (slug && slug !== "naslovna") slugs.add(slug);
  }
  return slugs;
}

async function main(): Promise<void> {
  const argvArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const sqlPath =
    argvArgs[0] ||
    process.env.WP_SQL_FILE ||
    pathResolve(
      "C:/Users/USER/Desktop/Projekti/Motrenko/Podaci i fajlovi sa Oriona-sve/humanrep_tatjana.sql",
    );

  console.log("Čitam:", sqlPath);
  const dump = readFileSync(sqlPath, "utf8");

  /**
   * SSOT sa `migrate-wordpress-etl.ts`: uploads prefiksi + `inferOldSiteOriginFromEnv()` (ili eksplicitni `MIGRATE_OLD_SITE_ORIGIN`).
   */
  const sanitizeOpts: SanitizeWordPressContentOptions = {
    ...sanitizeOptionsFromEnv(),
    oldSiteOrigin:
      process.env.MIGRATE_OLD_SITE_ORIGIN?.trim().replace(/\/+$/, "") ||
      inferOldSiteOriginFromEnv(),
  };

  const headerPagesOnly =
    process.argv.includes("--only-header-and-pages") ||
    process.env.IMPORT_WP_ONLY_HEADER_PAGES === "1";

  const optRows = extractInsertTuples(dump, "wp_options");
  const options = new Map<string, string>();
  for (const row of optRows) {
    options.set(normSqlString(row[1] ?? ""), normSqlString(row[2] ?? ""));
  }

  const wpTerms = extractInsertTuples(dump, "wp_terms");
  const termsById = new Map<number, { name: string; slug: string }>();
  for (const r of wpTerms) {
    termsById.set(Number(r[0]), {
      name: normSqlString(r[1] ?? ""),
      slug: normSqlString(r[2] ?? ""),
    });
  }

  const wpTermTax = extractInsertTuples(dump, "wp_term_taxonomy");
  const termTaxonomyByTermId = new Map<number, number>();
  for (const r of wpTermTax) {
    const ttId = Number(r[0]);
    const termId = Number(r[1]);
    if (Number.isFinite(ttId) && Number.isFinite(termId)) {
      termTaxonomyByTermId.set(termId, ttId);
    }
  }

  const objectTaxonomies = buildObjectTaxonomies(dump);

  const postRows = extractInsertTuples(dump, "wp_posts").map(parseWpPostRow);
  const postsById = new Map(postRows.map((p) => [p.id, p]));

  const metaRows = extractInsertTuples(dump, "wp_postmeta");
  const metaByPost = new Map<number, Record<string, string>>();
  for (const m of metaRows) {
    const pid = Number(m[1]);
    const k = normSqlString(m[2] ?? "");
    const v = normSqlString(m[3] ?? "");
    if (!Number.isFinite(pid) || !k) continue;
    const rec = metaByPost.get(pid) ?? {};
    rec[k] = v;
    metaByPost.set(pid, rec);
  }

  const relRows = extractInsertTuples(dump, "wp_term_relationships");
  const inPrimaryMenu = new Set<number>();
  for (const r of relRows) {
    const oid = Number(r[0]);
    const tt = Number(r[1]);
    if (tt === PRIMARY_MENU_TT) inPrimaryMenu.add(oid);
  }

  const inFooterMenu = new Set<number>();
  if (Number.isFinite(FOOTER_MENU_TT) && FOOTER_MENU_TT !== PRIMARY_MENU_TT) {
    for (const r of relRows) {
      const oid = Number(r[0]);
      const tt = Number(r[1]);
      if (tt === FOOTER_MENU_TT) inFooterMenu.add(oid);
    }
  }

  const publishedPosts = postRows.filter(
    (p) => p.postType === "post" && p.postStatus === "publish",
  );

  const teamWpPosts = publishedPosts.filter((p) =>
    objectTaxonomies.get(p.id)?.has(WP_CAT_OSOBLJE_TT),
  );
  const newsPosts = publishedPosts.filter(
    (p) => !objectTaxonomies.get(p.id)?.has(WP_CAT_OSOBLJE_TT),
  );

  const wpPages = postRows.filter(
    (p) =>
      p.postType === "page" &&
      p.postStatus === "publish" &&
      p.postName !== "naslovna" &&
      p.postName.trim().length > 0,
  );

  const menuItems: MenuItem[] = [];
  for (const wpId of inPrimaryMenu) {
    const p = postsById.get(wpId);
    if (!p || p.postType !== "nav_menu_item" || p.postStatus !== "publish") {
      continue;
    }
    const meta = metaByPost.get(wpId) ?? {};
    const href = resolveMenuHref(meta, postsById, termTaxonomyByTermId);
    const parentRaw = Number.parseInt(
      meta._menu_item_menu_item_parent || "0",
      10,
    );
    const title = menuItemTitle(p, meta, postsById, termsById);

    menuItems.push({
      wpId,
      title,
      href,
      sortOrder: p.menuOrder,
      parentWp: parentRaw,
    });
  }

  menuItems.sort((a, b) =>
    a.sortOrder !== b.sortOrder
      ? a.sortOrder - b.sortOrder
      : a.wpId - b.wpId,
  );

  const footerMenuItems: MenuItem[] = [];
  for (const wpId of inFooterMenu) {
    const p = postsById.get(wpId);
    if (!p || p.postType !== "nav_menu_item" || p.postStatus !== "publish") {
      continue;
    }
    const meta = metaByPost.get(wpId) ?? {};
    const href = resolveMenuHref(meta, postsById, termTaxonomyByTermId);
    const parentRaw = Number.parseInt(
      meta._menu_item_menu_item_parent || "0",
      10,
    );
    const title = menuItemTitle(p, meta, postsById, termsById);

    footerMenuItems.push({
      wpId,
      title,
      href,
      sortOrder: p.menuOrder,
      parentWp: parentRaw,
    });
  }

  footerMenuItems.sort((a, b) =>
    a.sortOrder !== b.sortOrder
      ? a.sortOrder - b.sortOrder
      : a.wpId - b.wpId,
  );

  const footerWpToNewId = new Map<number, string>();
  for (const it of footerMenuItems) {
    footerWpToNewId.set(it.wpId, randomUUID());
  }

  const wpToNewId = new Map<number, string>();
  for (const it of menuItems) {
    wpToNewId.set(it.wpId, randomUUID());
  }

  const childrenByParentWp = new Map<number, MenuItem[]>();
  for (const it of menuItems) {
    if (!it.parentWp) continue;
    const list = childrenByParentWp.get(it.parentWp) ?? [];
    list.push(it);
    childrenByParentWp.set(it.parentWp, list);
  }
  const roots = menuItems.filter((it) => !it.parentWp);
  const servicesRoot = roots.find(
    (r) => (childrenByParentWp.get(r.wpId)?.length ?? 0) > 0,
  );

  let heroSecondaryHref = "#usluge";
  if (servicesRoot) {
    const h = servicesRoot.href.trim();
    if (h.startsWith("#")) heroSecondaryHref = h;
    else if (h.startsWith("http")) heroSecondaryHref = h;
    else if (h === "/") heroSecondaryHref = "#novosti";
    else heroSecondaryHref = h;
  }

  const logoOpt = options.get("theme_mods_shapely") || "";
  const mLogo = logoOpt.match(/s:11:"custom_logo";i:(\d+)/);

  let linkedPageSlugs = new Set<string>();

  const canonicalAssets = new Map<string, MirroredAsset>();
  const urlQueue = new Set<string>();

  if (headerPagesOnly) {
    linkedPageSlugs = collectLinkedPageSlugs(menuItems);
    const linkedPages = wpPages.filter((p) => linkedPageSlugs.has(p.postName));
    let htmlBlob = linkedPages.map((p) => p.postContent).join("\n");
    if (linkedPageSlugs.has("tim")) {
      htmlBlob += `\n${teamWpPosts.map((p) => p.postContent).join("\n")}`;
    }
    for (const u of humanrepUrlsInHtml(htmlBlob)) {
      urlQueue.add(u);
    }
    for (const pg of linkedPages) {
      const meta = metaByPost.get(pg.id) ?? {};
      const thumbId = Number.parseInt(meta._thumbnail_id || "0", 10);
      if (thumbId > 0) {
        const att = postsById.get(thumbId);
        const g = att?.guid?.trim();
        if (g?.startsWith("http")) urlQueue.add(g.split("?")[0]);
      }
    }
    console.log(
      `[samo header + stranice] Slugova iz menija: ${linkedPageSlugs.size}, mirror URL: ${urlQueue.size}`,
    );
  } else {
    for (const u of humanrepUrlsInHtml(
      publishedPosts.map((p) => p.postContent).join("\n") +
        wpPages.map((p) => p.postContent).join("\n"),
    )) {
      urlQueue.add(u);
    }

    for (const p of publishedPosts) {
      const meta = metaByPost.get(p.id) ?? {};
      const thumbId = Number.parseInt(meta._thumbnail_id || "0", 10);
      if (thumbId > 0) {
        const att = postsById.get(thumbId);
        const g = att?.guid?.trim();
        if (g?.startsWith("http")) urlQueue.add(g.split("?")[0]);
      }
    }

    if (mLogo) {
      const lid = Number.parseInt(mLogo[1]!, 10);
      const att = postsById.get(lid);
      const g = att?.guid?.trim();
      if (g?.startsWith("http")) urlQueue.add(g.split("?")[0]);
    }

    for (const att of postRows) {
      if (att.postType !== "attachment") continue;
      const g = att.guid?.trim();
      if (g?.includes("humanreproduction.com"))
        urlQueue.add(g.split("?")[0]);
    }
  }

  console.log("Preuzimam resurse (slike),", urlQueue.size, "URL…");
  const mirrorFailures = { n: 0 };
  let i = 0;
  for (const u of urlQueue) {
    i++;
    await mirrorAsset(u, canonicalAssets, mirrorFailures);
    if (i % 10 === 0) console.log(" …", i, "/", urlQueue.size);
  }

  const relPathByRemote = new Map<string, string>();
  for (const [remote, mir] of canonicalAssets) {
    relPathByRemote.set(remote, mir.rel);
  }

  function mediaInsertFromMirror(
    id: string,
    remoteUrl: string,
    fileHint: string,
  ): typeof media.$inferInsert | null {
    const key = remoteUrl.split("?")[0].replace(/\/$/, "");
    const mir =
      canonicalAssets.get(key) ??
      canonicalAssets.get(remoteUrl.split("?")[0]);
    if (!mir) return null;
    return {
      id,
      filename:
        fileHint.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200) || "f.jpg",
      storageKey: mir.rel,
      mimeType: mir.mime,
      sizeBytes: mir.size,
      width: null,
      height: null,
      altText: null,
      createdAt: new Date(),
    };
  }

  const wpAttIdToMediaId = new Map<number, string>();
  const mediaToInsert = new Map<string, typeof media.$inferInsert>();

  function mediaIdForWpAttachment(wpAttId: number): string | null {
    const hit = wpAttIdToMediaId.get(wpAttId);
    if (hit) return hit;
    const att = postsById.get(wpAttId);
    if (!att || att.postType !== "attachment") return null;
    const url = att.guid.trim();
    if (!url.startsWith("http")) return null;
    const id = randomUUID();
    wpAttIdToMediaId.set(wpAttId, id);
    const row = mediaInsertFromMirror(id, url, att.postName || `wp-${wpAttId}`);
    if (row) mediaToInsert.set(id, row);
    return id;
  }

  let logoMediaId: string | null = null;
  if (!headerPagesOnly) {
    const logoAttachmentId = mLogo ? Number.parseInt(mLogo[1]!, 10) : null;
    logoMediaId = logoAttachmentId
      ? mediaIdForWpAttachment(logoAttachmentId)
      : null;

    for (const bp of publishedPosts) {
      const meta = metaByPost.get(bp.id) ?? {};
      const thumbId = Number.parseInt(meta._thumbnail_id || "0", 10);
      if (thumbId > 0) mediaIdForWpAttachment(thumbId);
    }
  }

  const localeN = locales.length;
  const newsCount = newsPosts.length;
  const teamCount = teamWpPosts.length;
  const postsBlogTeamInserted = newsCount + teamCount;
  const postTranslationsInserted = postsBlogTeamInserted * localeN;
  const sitePagesCount = wpPages.length;
  const sitePageTranslationsInserted = sitePagesCount * localeN;
  const wpPostsParsed = postRows.length;
  const menuItemsCount = menuItems.length;
  const footerMenuItemsCount = footerMenuItems.length;
  const navLinkTranslationsInserted =
    (menuItemsCount + footerMenuItemsCount) * localeN;

  if (headerPagesOnly) {
    console.log(
      `[samo header + stranice] Kraj pripreme: stavki menija ${menuItemsCount}, slugova /s/... iz menija ${linkedPageSlugs.size}, zapisa medija za insert ${mediaToInsert.size}.`,
    );
  } else {
    console.log(
      `Uvoz: meni ${menuItemsCount}, footer meni ${footerMenuItemsCount}, novosti ${newsCount}, tim ${teamCount}, stranice ${sitePagesCount}, medij zapisa ${mediaToInsert.size}.`,
    );
  }

  if (headerPagesOnly) {
    await db.transaction(async (tx) => {
      const headerRows = await tx
        .select({ id: navLinks.id })
        .from(navLinks)
        .where(eq(navLinks.placement, "header"));
      const headerLinkIds = headerRows.map((r) => r.id);
      if (headerLinkIds.length > 0) {
        await tx
          .delete(navLinkTranslations)
          .where(inArray(navLinkTranslations.navLinkId, headerLinkIds));
        await tx.delete(navLinks).where(eq(navLinks.placement, "header"));
      }

      for (const m of mediaToInsert.values()) {
        await tx.insert(media).values(m);
      }

      for (const it of menuItems) {
        const parentNew =
          it.parentWp && wpToNewId.has(it.parentWp)
            ? wpToNewId.get(it.parentWp)!
            : null;
        await tx.insert(navLinks).values({
          id: wpToNewId.get(it.wpId)!,
          parentId: parentNew,
          sortOrder: it.sortOrder,
          href: it.href,
          visible: true,
          placement: "header",
          footerColumn: 0,
          updatedAt: new Date(),
        });
        for (const loc of locales) {
          await tx.insert(navLinkTranslations).values({
            id: randomUUID(),
            navLinkId: wpToNewId.get(it.wpId)!,
            locale: loc,
            label: navLinkLabelForInsert(it, sanitizeOpts),
          });
        }
      }

      const wpPageBySlug = new Map(wpPages.map((p) => [p.postName, p]));
      for (const slug of linkedPageSlugs) {
        const pg = wpPageBySlug.get(slug);
        if (!pg) {
          console.warn(
            `[samo header + stranice] U meniju je /s/${slug}, ali nema objavljene WP stranice sa tim slugom — preskačem.`,
          );
          continue;
        }

        let bodyHtml = rewriteHumanrepUrls(pg.postContent, relPathByRemote);

        if (
          pg.postName === "tim" &&
          /\[the-post-grid|\[the_post_grid/i.test(pg.postContent)
        ) {
          bodyHtml = bodyHtml.replace(
            /<!--\s*wp:shortcode[^>]*-->[\s\S]*?<!--\s*\/wp:shortcode\s*-->/gi,
            "",
          );
          bodyHtml = bodyHtml.replace(/\[the-post-grid[^\]]*\]/gi, "");
          bodyHtml = `${teamListingHtml(teamWpPosts, sanitizeOpts)}\n${bodyHtml}`;
        }

        bodyHtml = sanitizeWordPressContent(bodyHtml, {
          ...sanitizeOpts,
          contentKind: "html",
        });

        const t = titleOrFallback(
          normalizeLabel(
            sanitizeWordPressContent(pg.postTitle, {
              ...sanitizeOpts,
              contentKind: "plain",
            }),
          ),
          pg.postName,
        ).slice(0, 500);

        const existing = await tx
          .select({ id: sitePages.id })
          .from(sitePages)
          .where(eq(sitePages.slug, pg.postName.slice(0, 255)))
          .limit(1);
        const pageId = existing[0]?.id ?? randomUUID();

        if (existing[0]) {
          await tx
            .update(sitePages)
            .set({
              published: true,
              updatedAt: new Date(),
            })
            .where(eq(sitePages.id, pageId));
        } else {
          await tx.insert(sitePages).values({
            id: pageId,
            slug: pg.postName.slice(0, 255),
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        for (const loc of locales) {
          const tr = await tx
            .select({ id: sitePageTranslations.id })
            .from(sitePageTranslations)
            .where(
              and(
                eq(sitePageTranslations.pageId, pageId),
                eq(sitePageTranslations.locale, loc),
              ),
            )
            .limit(1);
          if (tr[0]) {
            await tx
              .update(sitePageTranslations)
              .set({
                title: t,
                body: textOrNull(bodyHtml),
              })
              .where(eq(sitePageTranslations.id, tr[0].id));
          } else {
            await tx.insert(sitePageTranslations).values({
              id: randomUUID(),
              pageId,
              locale: loc,
              title: t,
              body: textOrNull(bodyHtml),
            });
          }
        }
      }
    });
  } else {
    await db.transaction(async (tx) => {
    await tx
      .update(siteGlobals)
      .set({
        logoMediaId: null,
        faviconMediaId: null,
        heroBgMediaId: null,
      })
      .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID));

    await tx.delete(sitePageTranslations);
    await tx.delete(sitePages);
    await tx.delete(siteLocaleStrings);
    await tx.delete(navLinkTranslations);
    await tx.delete(navLinks);
    await tx.delete(postTranslations);
    await tx.delete(posts);
    await tx.delete(mediaAltTranslations);
    await tx.delete(media);

    for (const m of mediaToInsert.values()) {
      await tx.insert(media).values(m);
    }

    for (const it of menuItems) {
      const parentNew =
        it.parentWp && wpToNewId.has(it.parentWp)
          ? wpToNewId.get(it.parentWp)!
          : null;
      await tx.insert(navLinks).values({
        id: wpToNewId.get(it.wpId)!,
        parentId: parentNew,
        sortOrder: it.sortOrder,
        href: it.href,
        visible: true,
        placement: "header",
        footerColumn: 0,
        updatedAt: new Date(),
      });
      for (const loc of locales) {
        await tx.insert(navLinkTranslations).values({
          id: randomUUID(),
          navLinkId: wpToNewId.get(it.wpId)!,
          locale: loc,
          label: navLinkLabelForInsert(it, sanitizeOpts),
        });
      }
    }

    for (const it of footerMenuItems) {
      const parentNew =
        it.parentWp && footerWpToNewId.has(it.parentWp)
          ? footerWpToNewId.get(it.parentWp)!
          : null;
      await tx.insert(navLinks).values({
        id: footerWpToNewId.get(it.wpId)!,
        parentId: parentNew,
        sortOrder: it.sortOrder,
        href: it.href,
        visible: true,
        placement: "footer",
        footerColumn: 1,
        updatedAt: new Date(),
      });
      for (const loc of locales) {
        await tx.insert(navLinkTranslations).values({
          id: randomUUID(),
          navLinkId: footerWpToNewId.get(it.wpId)!,
          locale: loc,
          label: navLinkLabelForInsert(it, sanitizeOpts),
        });
      }
    }

    const overrides: Partial<Record<SiteStringKey, string>> = {};
    const bn = options.get("blogname");
    if (bn) overrides["org.brand"] = bn;
    const bd = options.get("blogdescription");
    if (bd) overrides["org.subtitle"] = bd;
    const email = options.get("admin_email");
    if (email) overrides["contact.email"] = email;
    const about = pickAboutLead(postsById, sanitizeOpts);
    if (about) overrides["section.about_lead"] = about;
    overrides["header.cta_book_href"] = "#kontakt";
    overrides["hero.cta_primary_href"] = "#kontakt";
    overrides["hero.cta_secondary_href"] = heroSecondaryHref;

    const nowS = new Date();
    for (const loc of locales) {
      for (const key of SITE_STRING_KEYS) {
        const rawOverride = overrides[key];
        const value =
          rawOverride !== undefined
            ? sanitizeWordPressContent(rawOverride, {
                ...sanitizeOpts,
                contentKind: "plain",
              })
            : SITE_STRING_DEFAULTS[loc as Locale][key];
        await tx.insert(siteLocaleStrings).values({
          id: randomUUID(),
          fieldKey: key,
          locale: loc as Locale,
          value: value ?? "",
          updatedAt: nowS,
        });
      }
    }

    for (const pg of wpPages) {
      let bodyHtml = rewriteHumanrepUrls(pg.postContent, relPathByRemote);

      if (
        pg.postName === "tim" &&
        /\[the-post-grid|\[the_post_grid/i.test(pg.postContent)
      ) {
        bodyHtml = bodyHtml.replace(
          /<!--\s*wp:shortcode[^>]*-->[\s\S]*?<!--\s*\/wp:shortcode\s*-->/gi,
          "",
        );
        bodyHtml = bodyHtml.replace(/\[the-post-grid[^\]]*\]/gi, "");
        bodyHtml = `${teamListingHtml(teamWpPosts, sanitizeOpts)}\n${bodyHtml}`;
      }

      bodyHtml = sanitizeWordPressContent(bodyHtml, {
        ...sanitizeOpts,
        contentKind: "html",
      });

      const pageId = randomUUID();
      await tx.insert(sitePages).values({
        id: pageId,
        slug: pg.postName.slice(0, 255),
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const t = titleOrFallback(
        normalizeLabel(
          sanitizeWordPressContent(pg.postTitle, {
            ...sanitizeOpts,
            contentKind: "plain",
          }),
        ),
        pg.postName,
      ).slice(0, 500);
      for (const loc of locales) {
        await tx.insert(sitePageTranslations).values({
          id: randomUUID(),
          pageId,
          locale: loc,
          title: t,
          body: textOrNull(bodyHtml),
        });
      }
    }

    for (const bp of newsPosts) {
      const postId = randomUUID();
      const meta = metaByPost.get(bp.id) ?? {};
      const thumbId = Number.parseInt(meta._thumbnail_id || "0", 10);
      const coverId =
        thumbId > 0 ? mediaIdForWpAttachment(thumbId) : null;

      let bodyHtml = rewriteHumanrepUrls(bp.postContent, relPathByRemote);
      bodyHtml = sanitizeWordPressContent(bodyHtml, {
        ...sanitizeOpts,
        contentKind: "html",
      });
      const excerpt = excerptFromSanitizedBody(
        bodyHtml,
        bp.postExcerpt,
        sanitizeOpts,
      );

      await tx.insert(posts).values({
        id: postId,
        published: true,
        publishedAt: new Date(),
        contentRole: "blog",
        coverMediaId: coverId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const loc of locales) {
        await tx.insert(postTranslations).values({
          id: randomUUID(),
          postId,
          locale: loc,
          slug: (bp.postName || `post-${bp.id}`).slice(0, 255),
          title: titleOrFallback(
            normalizeLabel(
              sanitizeWordPressContent(bp.postTitle, {
                ...sanitizeOpts,
                contentKind: "plain",
              }),
            ),
            "Bez naslova",
          ).slice(0, 500),
          excerpt: textOrNull(excerpt),
          body: textOrNull(bodyHtml),
          metaTitle: null,
          metaDescription: textOrNull(
            excerpt?.trim() ? excerpt.slice(0, 512) : null,
          ),
        });
      }
    }

    for (const bp of teamWpPosts) {
      const postId = randomUUID();
      const meta = metaByPost.get(bp.id) ?? {};
      const thumbId = Number.parseInt(meta._thumbnail_id || "0", 10);
      const coverId =
        thumbId > 0 ? mediaIdForWpAttachment(thumbId) : null;

      let bodyHtml = rewriteHumanrepUrls(bp.postContent, relPathByRemote);
      bodyHtml = sanitizeWordPressContent(bodyHtml, {
        ...sanitizeOpts,
        contentKind: "html",
      });
      const excerpt = excerptFromSanitizedBody(
        bodyHtml,
        bp.postExcerpt,
        sanitizeOpts,
      );

      await tx.insert(posts).values({
        id: postId,
        published: true,
        publishedAt: new Date(),
        contentRole: "team",
        coverMediaId: coverId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const loc of locales) {
        await tx.insert(postTranslations).values({
          id: randomUUID(),
          postId,
          locale: loc,
          slug: (bp.postName || `post-${bp.id}`).slice(0, 255),
          title: titleOrFallback(
            normalizeLabel(
              sanitizeWordPressContent(bp.postTitle, {
                ...sanitizeOpts,
                contentKind: "plain",
              }),
            ),
            "Bez naslova",
          ).slice(0, 500),
          excerpt: textOrNull(excerpt),
          body: textOrNull(bodyHtml),
          metaTitle: null,
          metaDescription: textOrNull(
            excerpt?.trim() ? excerpt.slice(0, 512) : null,
          ),
        });
      }
    }

    if (logoMediaId) {
      await tx
        .update(siteGlobals)
        .set({
          logoMediaId,
          updatedAt: new Date(),
        })
        .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID));
    }
  });
  }

  const mirrorUrlsAttempted = urlQueue.size;
  if (headerPagesOnly) {
    console.log(`
========== WordPress — samo header + stranice iz menija ==========
Režim: ne dira posts, footer meni, site_locale_strings, ostale site_pages.
Header stavki:                    ${menuItemsCount}
Slugova stranica ažurirano:       ${linkedPageSlugs.size}
Novi media redovi (thumbnail…):   ${mediaToInsert.size}
Mirror URL pokušaja:             ${mirrorFailures.n} neuspjelo / ${mirrorUrlsAttempted} ukupno
===============================================================`);
  } else {
    console.log(`
========== WordPress SQL import — izvještaj ==========
UTF-8: čitanje dumpa kao utf8; Drizzle koristi pool utf8mb4 (lib/create-mysql-pool).
wp_posts redova u parsiranom dumpu:     ${wpPostsParsed}
Novosti (blog):                          ${newsCount}
Tim:                                     ${teamCount}
Ubačeno posts (blog+tim):                ${postsBlogTeamInserted}
Ubačeno post_translations redova:        ${postTranslationsInserted} (${localeN} jez./post)
Stranica (site_pages):                   ${sitePagesCount}
Ubačeno site_page_translations redova:   ${sitePageTranslationsInserted}
Stavki menija (header):                  ${menuItemsCount}
Stavki menija (footer):                  ${footerMenuItemsCount}
Ubačeno nav_link_translations redova:    ${navLinkTranslationsInserted}
Ubačeno media redova:                    ${mediaToInsert.size}
Neuspjelo preuzimanje resursa (mirror): ${mirrorFailures.n} / ${mirrorUrlsAttempted} URL
Grešaka po zapisu (SQL uvoz):            0 (atomarna transakcija)
======================================================`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
