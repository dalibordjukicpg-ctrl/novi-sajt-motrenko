import type { PublicNavItem } from "@/lib/queries/site";

/** Vrijednosti u koloni site_pages.header_nav_group (admin padajući meni). */
export const SITE_PAGE_HEADER_GROUP_OPTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "", label: "Nije pod „Uslugama“ (glavni red menija)" },
  { value: "infertilitet", label: "Infertilitet i sterilitet" },
  { value: "iui_ivf", label: "IUI i IVF" },
  { value: "ginekologija", label: "Ginekologija" },
  { value: "trudnoca", label: "Trudnoća" },
  { value: "prezervacija", label: "Prezervacija fertilnosti" },
];

/** Redoslijed stubova u mega meniju (mora odgovarati padajućem u adminu). */
export const USLUGE_NAV_GROUP_ORDER: string[] = SITE_PAGE_HEADER_GROUP_OPTIONS.map(
  (o) => o.value,
).filter((v) => v.length > 0);

/** Ključne riječi za sparivanje sa postojećom stavkom pod „Uslugama“ (label iz nav_links). */
const GROUP_LABEL_KEYWORDS: Record<string, string[]> = {
  infertilitet: ["infertilitet", "sterilitet"],
  iui_ivf: ["iui", "ivf"],
  ginekologija: ["ginekologija", "ginekoloska", "ginekol"],
  trudnoca: ["trudnoca", "trudnoce"],
  prezervacija: ["prezervacija", "fertilnost"],
};

function normNavLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase();
}

/** Prepoznaj glavnu stavku mega menija — striktno da „usluga“ u sredini rečenice ne bi progutala cijeli meni. */
export function looksLikeUslugeParent(item: PublicNavItem): boolean {
  const L = normNavLabel(item.label);
  const compact = L.replace(/\s+/g, " ").trim();

  if (
    compact === "usluge" ||
    compact === "usluga" ||
    compact === "nase usluge" ||
    compact === "usluge klinike"
  ) {
    return true;
  }
  if (/\busluge\b/.test(compact) && compact.length <= 36) return true;
  if (/\busluga\b/.test(compact) && compact.length <= 36) return true;

  if (
    compact === "services" ||
    compact === "service" ||
    (/\bservices\b/.test(compact) && compact.length <= 36)
  ) {
    return true;
  }

  // RU: „Услуги“ (русский) и „Услуге“ (српска ћирилица)
  const lower = item.label.toLowerCase();
  if (lower.includes("услуге") || lower.includes("услуги")) return true;
  if (compact === "услуги" || compact === "услуга") return true;
  if (/\bуслуг[иае]\b/.test(compact) && compact.length <= 36) return true;

  const h = item.href.trim().toLowerCase();
  const hashIdx = h.indexOf("#");
  const frag = hashIdx >= 0 ? h.slice(hashIdx) : "";
  if (
    frag === "#usluge" ||
    frag === "#usluga" ||
    /^#usluge[?&]/.test(frag) ||
    /^#usluga[?&]/.test(frag)
  ) {
    return true;
  }
  if (h.endsWith("#usluge") || h.endsWith("#usluga")) return true;

  const pathOnly = hashIdx >= 0 ? h.slice(0, hashIdx) : h;
  if (/\/usluge\/?(\?[^#]*)?$/.test(pathOnly)) return true;
  if (/\/usluga\/?(\?[^#]*)?$/.test(pathOnly)) return true;
  return false;
}

function cloneNavBranch(node: PublicNavItem): PublicNavItem {
  return {
    ...node,
    children: node.children.map((c) => cloneNavBranch(c)),
  };
}

function normHrefLocal(h: string): string {
  let x = h.trim().toLowerCase();
  x = x.replace(/^https?:\/\/[^/]+/i, "");
  x = x.replace(/^\/(?:me|en|ru|tr)(?=\/)/i, "");
  const hash = x.indexOf("#");
  if (hash >= 0) x = x.slice(0, hash);
  x = x.replace(/\/+$/, "");
  return x || "/";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Mapiranje stuba u mega meniju (label/href čvora ispod „Usluga“) na ključ grupe iz admina. */
export function matchNavNodeToUslugeGroupKey(node: PublicNavItem): string | null {
  const L = normNavLabel(node.label);
  const H = normHrefLocal(node.href).replace(/#/g, "");
  for (const gk of USLUGE_NAV_GROUP_ORDER) {
    const kws = GROUP_LABEL_KEYWORDS[gk];
    if (!kws?.length) continue;
    for (const rawKw of kws) {
      const n = normNavLabel(rawKw);
      if (!n) continue;
      if (n.length <= 3) {
        const re = new RegExp(`(^|\\s)${escapeRegExp(n)}(\\s|$)`);
        if (re.test(L) || H.includes(n)) return gk;
      } else if (L.includes(n) || H.includes(n.replace(/\s/g, ""))) {
        return gk;
      }
    }
  }
  return null;
}

/** Javni header: samo ove grupe ispod „Usluga“. Ostale kolone iz baze (WP uvoz) se ne prikazuju. */
const PUBLIC_HEADER_ALLOWED_USLUGE_GROUPS = new Set([
  "infertilitet",
  "iui_ivf",
  "ginekologija",
  "trudnoca",
  "prezervacija",
]);

export function looksLikeONamaNavRoot(item: PublicNavItem): boolean {
  const L = normNavLabel(item.label);
  const compact = L.replace(/\s+/g, " ").trim();
  if (compact === "o nama" || compact.startsWith("o nama ")) return true;
  if (/\bo nama\b/.test(compact) && compact.length <= 48) return true;
  if (compact === "about us" || compact === "about" || /\babout us\b/.test(compact)) {
    return true;
  }
  // RU: „О нас“ / „О компании“
  if (compact === "о нас" || compact.startsWith("о нас ")) return true;
  if (/\bо нас\b/.test(compact) && compact.length <= 48) return true;
  if (compact === "о компании" || /\bо компании\b/.test(compact)) return true;
  if (compact === "о клинике" || /\bо клинике\b/.test(compact)) return true;
  const h = item.href.trim().toLowerCase();
  if (h.includes("#o-nama") || h.includes("/o-nama")) return true;
  const path = h.replace(/^https?:\/\/[^/]+/i, "");
  if (/\/s\/o-nama\b/.test(path)) return true;
  return false;
}

export function looksLikeBlogNavRoot(item: PublicNavItem): boolean {
  const L = normNavLabel(item.label);
  const compact = L.replace(/\s+/g, " ").trim();
  if (compact === "blog" || /\bblog\b/.test(compact)) return true;
  if (compact === "novosti" && compact.length <= 24) return true;
  // RU: „Блог“ / „Новости“
  if (compact === "блог" || /\bблог\b/.test(compact)) return true;
  if (compact === "новости" || /\bновости\b/.test(compact)) return true;
  const h = item.href.trim().toLowerCase();
  const path = h.replace(/^https?:\/\/[^/]+/i, "");
  if (h.includes("#novosti") || path.includes("/blog")) return true;
  if (/\/posts\/?(\?|#|$)/.test(path)) return true;
  return false;
}

function looksLikeKontaktNavRoot(item: PublicNavItem): boolean {
  const L = normNavLabel(item.label);
  const h = item.href.trim().toLowerCase();
  if (/\bkontakt\b/.test(L) || /\bcontact\b/.test(L)) return true;
  // RU: „Контакт“ / „Контакты“
  if (/\bконтакт(ы)?\b/.test(L)) return true;
  if (h.includes("#kontakt") || h.includes("/kontakt") || h.includes("/contact")) {
    return true;
  }
  return false;
}

/**
 * Forsira javni header: „O nama“ (s padajućim ako postoji), „Usluge“, „Blog“, „Kontakt“.
 * Baza (`nav_links`) može i dalje sadržati višak — on se ovdje odbacuje pri renderu.
 *
 * Za privremeni pun meni (debug): `NAV_HEADER_FULL=1`.
 */
export function applyPublicHeaderNavPolicy(roots: PublicNavItem[]): PublicNavItem[] {
  if (process.env.NAV_HEADER_FULL === "1") return roots;

  const out: PublicNavItem[] = [];

  for (const r of roots) {
    if (looksLikeUslugeParent(r)) {
      const children = r.children
        .filter((c) => {
          const gk = matchNavNodeToUslugeGroupKey(c);
          return gk !== null && PUBLIC_HEADER_ALLOWED_USLUGE_GROUPS.has(gk);
        })
        .map((c) => cloneNavBranch(c));
      out.push({ ...r, children });
    } else if (looksLikeONamaNavRoot(r)) {
      out.push(cloneNavBranch(r));
    } else if (looksLikeBlogNavRoot(r)) {
      out.push({ ...cloneNavBranch(r), children: [] });
    } else if (looksLikeKontaktNavRoot(r)) {
      out.push({ ...r, children: [] });
    }
  }

  return out;
}

/** Red glavnog menija: O nama → Usluge → Blog → Kontakt (+ ostalo na kraju). */
export function sortPublicHeaderRoots(roots: PublicNavItem[]): void {
  function rank(x: PublicNavItem): number {
    if (looksLikeONamaNavRoot(x)) return 0;
    if (looksLikeUslugeParent(x)) return 1;
    if (looksLikeBlogNavRoot(x)) return 2;
    if (looksLikeKontaktNavRoot(x)) return 3;
    return 4;
  }

  roots.sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return normNavLabel(a.label).localeCompare(normNavLabel(b.label), "sr");
  });
}

/**
 * Red public navigacije nakon `promoteUslugeCategoriesToTopLevel`: „O nama“, stubovi usluga (kanonski red), „Kontakt“.
 */
export function sortPromotedHeaderRoots(roots: PublicNavItem[]): void {
  function rank(item: PublicNavItem): number {
    if (looksLikeONamaNavRoot(item)) return 0;
    if (looksLikeKontaktNavRoot(item)) return 200;
    const gk = matchNavNodeToUslugeGroupKey(item);
    if (gk) {
      const i = USLUGE_NAV_GROUP_ORDER.indexOf(gk);
      return 10 + (i >= 0 ? i : 50);
    }
    return 150;
  }

  roots.sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return normNavLabel(a.label).localeCompare(normNavLabel(b.label), "sr");
  });
}

/**
 * Stubovi odmah pod „Uslugama“ (mega meni) u redoslijedu definisanom u adminu / `USLUGE_NAV_GROUP_ORDER`.
 * Osigurava ispravan poredak i kad se sintetički stubovi dodaju kasnije (`applyCanonical*`).
 */
export function sortUslugeCategoryPillars(roots: PublicNavItem[]): void {
  const usluge = roots.find((r) => looksLikeUslugeParent(r));
  if (!usluge) return;
  const order = USLUGE_NAV_GROUP_ORDER;
  usluge.children.sort((a, b) => {
    const ga = matchNavNodeToUslugeGroupKey(a);
    const gb = matchNavNodeToUslugeGroupKey(b);
    const ia = ga ? order.indexOf(ga) : -1;
    const ib = gb ? order.indexOf(gb) : -1;
    const ra = ia === -1 ? 1000 : ia;
    const rb = ib === -1 ? 1000 : ib;
    if (ra !== rb) return ra - rb;
    return normNavLabel(a.label).localeCompare(normNavLabel(b.label), "sr");
  });
}

function extractSlugFromPublicHref(href: string): string | null {
  const t = href.trim();
  const m = t.match(/\/s\/([^/?#"'\s]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return m[1]!;
  }
}

function isKnownUslugeGroupKey(k: string): boolean {
  return Object.prototype.hasOwnProperty.call(GROUP_LABEL_KEYWORDS, k);
}

/**
 * Za spljošten list pod „Uslugama“: grupa iz `site_pages.header_nav_group` (slug) ili ključne riječi u naslovu.
 */
function inferGroupKeyForFlatLeaf(
  node: PublicNavItem,
  slugToGroup: ReadonlyMap<string, string>,
): string | null {
  const slug = extractSlugFromPublicHref(node.href);
  if (slug) {
    const fromDb = slugToGroup.get(slug);
    if (fromDb && isKnownUslugeGroupKey(fromDb)) return fromDb;
  }
  const L = normNavLabel(node.label);
  for (const gk of USLUGE_NAV_GROUP_ORDER) {
    const kws = GROUP_LABEL_KEYWORDS[gk];
    if (!kws?.length) continue;
    for (const rawKw of kws) {
      const n = normNavLabel(rawKw);
      if (n.length < 4) continue;
      if (L.includes(n)) return gk;
    }
  }
  return null;
}

function syntheticUslugePillar(groupKey: string): PublicNavItem {
  const opt = SITE_PAGE_HEADER_GROUP_OPTIONS.find((o) => o.value === groupKey);
  const label = (opt?.label ?? groupKey).toUpperCase();
  return {
    id: `nav-synthetic-usluge-${groupKey}`,
    href: `#usluge-${groupKey}`,
    label,
    children: [],
  };
}

/**
 * Nakon spljoštenog menija: listovi ispod „Uslugama“ grupišu se u stubove kao kod Infertiliteta —
 * prema `header_nav_group` u bazi (slug → grupa) uz postojeće stubove iz nav_links.
 */
export function nestUslugeLeavesIntoCategoryColumns(
  roots: PublicNavItem[],
  slugToGroup: ReadonlyMap<string, string>,
): void {
  const usluge = findUslugeRoot(roots);
  if (!usluge || usluge.children.length === 0) return;

  const order = USLUGE_NAV_GROUP_ORDER;
  const pillarByGk = new Map<string, PublicNavItem>();
  const extrasByGk = new Map<string, PublicNavItem[]>();
  const unassigned: PublicNavItem[] = [];
  for (const gk of order) extrasByGk.set(gk, []);

  const duplicatePillars: PublicNavItem[] = [];

  for (const child of usluge.children) {
    const gkStub = matchNavNodeToUslugeGroupKey(child);
    if (gkStub) {
      if (!pillarByGk.has(gkStub)) {
        pillarByGk.set(gkStub, child);
      } else {
        duplicatePillars.push(child);
      }
    } else {
      const inferred = inferGroupKeyForFlatLeaf(child, slugToGroup);
      if (inferred) {
        extrasByGk.get(inferred)!.push(child);
      } else {
        unassigned.push(child);
      }
    }
  }

  for (const dup of duplicatePillars) {
    const gk = matchNavNodeToUslugeGroupKey(dup);
    if (!gk) continue;
    const bucket = extrasByGk.get(gk)!;
    if (dup.children.length > 0) {
      for (const c of dup.children) bucket.push(c);
    } else {
      bucket.push({ ...dup, children: [] });
    }
  }

  const out: PublicNavItem[] = [];

  for (const gk of order) {
    const pillar = pillarByGk.get(gk);
    const extras = extrasByGk.get(gk) ?? [];
    if (!pillar && extras.length === 0) continue;

    const column = pillar ?? syntheticUslugePillar(gk);
    const merged: PublicNavItem[] = [];
    const seen = new Set<string>();

    function pushDedup(n: PublicNavItem) {
      const h = normHrefLocal(n.href);
      if (seen.has(h)) return;
      seen.add(h);
      merged.push(n);
    }

    for (const c of column.children) pushDedup(c);
    for (const x of extras) pushDedup(x);

    column.children = merged;
    if (column.children.length > 0) sortChildrenByLabel(column);
    out.push(column);
  }

  usluge.children = [...out, ...unassigned];

  for (const child of usluge.children) {
    if (child.children.length > 0) sortChildrenByLabel(child);
  }
}

/** Samo stavke koje odgovaraju grupama iz admin/CMS-a (bez širokih podstringova). */
function looksLikeKnownServiceCategory(item: PublicNavItem): boolean {
  const L = normNavLabel(item.label);
  for (const kws of Object.values(GROUP_LABEL_KEYWORDS)) {
    for (const rawKw of kws) {
      const n = normNavLabel(rawKw);
      if (!n) continue;
      if (n.length <= 3) {
        const re = new RegExp(`(^|\\s)${escapeRegExp(n)}(\\s|$)`);
        if (re.test(L)) return true;
      } else if (L.includes(n)) {
        return true;
      }
    }
  }
  return false;
}

function looksLikeNonServiceHeaderRoot(item: PublicNavItem): boolean {
  const L = normNavLabel(item.label);
  const skip = [
    "o nama",
    "kontakt",
    "blog",
    "novosti",
    "nas tim",
    "naš tim",
    "naslovna",
    "pocetna",
    "početna",
    "galerija",
    "cjenik",
    "cjenovnik",
    "faq",
    "partneri",
    // EN
    "about us",
    "about",
    "contact",
    "contact us",
    "our team",
    "home",
    "homepage",
    "gallery",
    "pricing",
    "price list",
    "partners",
    // RU
    "о нас",
    "о компании",
    "о клинике",
    "контакт",
    "контакты",
    "блог",
    "новости",
    "наша команда",
    "наш коллектив",
    "главная",
    "главная страница",
    "галерея",
    "цены",
    "прайс-лист",
    "прайс лист",
    "партнёры",
    "партнеры",
  ];
  for (const k of skip) {
    if (L === k || L.startsWith(k + " ")) return true;
  }
  return false;
}

function mergeChildrenDedupeByHref(
  into: PublicNavItem[],
  incoming: PublicNavItem[],
  seen: Set<string>,
) {
  for (const raw of incoming) {
    const node = cloneNavBranch(raw);
    const h = normHrefLocal(node.href);
    if (seen.has(h)) continue;
    seen.add(h);
    into.push(node);
  }
}

function buildMergedUslugeNode(roots: PublicNavItem[]): PublicNavItem | null {
  const syntheticId = "nav-root-usluge-bundle";
  const uslugeNodes = roots.filter((r) => looksLikeUslugeParent(r));

  const categoryPullOrdered: PublicNavItem[] = [];
  for (const r of roots) {
    if (
      !looksLikeUslugeParent(r) &&
      looksLikeKnownServiceCategory(r) &&
      !looksLikeNonServiceHeaderRoot(r)
    ) {
      categoryPullOrdered.push(r);
    }
  }

  if (uslugeNodes.length === 0 && categoryPullOrdered.length === 0) {
    return null;
  }

  const seen = new Set<string>();
  let merged: PublicNavItem;

  if (uslugeNodes.length > 0) {
    merged = cloneNavBranch(uslugeNodes[0]);
    for (const c of merged.children) {
      seen.add(normHrefLocal(c.href));
    }
    for (let i = 1; i < uslugeNodes.length; i++) {
      mergeChildrenDedupeByHref(merged.children, uslugeNodes[i].children, seen);
    }
    mergeChildrenDedupeByHref(merged.children, categoryPullOrdered, seen);
  } else {
    merged = {
      id: syntheticId,
      href: "#usluge",
      label: "USLUGE",
      children: [],
    };
    mergeChildrenDedupeByHref(merged.children, categoryPullOrdered, seen);
  }

  return merged;
}

/**
 * Spoji zasebne korijenske kategorije usluga u **jedan** čvor (mega meni), uz postojeći roditelj „Usluge“ ako postoji.
 * Idempotentno je nad istim stablom.
 */
export function consolidateServiceRootsUnderUsluge(
  roots: PublicNavItem[],
): PublicNavItem[] {
  if (process.env.SKIP_HEADER_USLUGE_CONSOLIDATE === "1") {
    return roots;
  }
  const merged = buildMergedUslugeNode(roots);
  if (!merged) return roots;

  const isPulledIn = (r: PublicNavItem) =>
    looksLikeUslugeParent(r) ||
    (looksLikeKnownServiceCategory(r) && !looksLikeNonServiceHeaderRoot(r));

  const out: PublicNavItem[] = [];
  let mergedEmitted = false;

  for (const r of roots) {
    if (isPulledIn(r)) {
      if (!mergedEmitted) {
        out.push(merged);
        mergedEmitted = true;
      }
      continue;
    }
    out.push(r);
  }

  if (!mergedEmitted) {
    out.push(merged);
  }

  return out;
}

/**
 * Podigni djecu „Usluga“ u glavni red menija (svaka kategorija = vlastiti dropdown), kao na referentnom kliničkom sajtu.
 * Čvor bez djece ostaje jedan link; ostalih korijena ne diramo.
 */
export function promoteUslugeCategoriesToTopLevel(
  roots: PublicNavItem[],
): PublicNavItem[] {
  const out: PublicNavItem[] = [];
  for (const r of roots) {
    if (looksLikeUslugeParent(r) && r.children.length > 0) {
      for (const cat of r.children) {
        out.push(cloneNavBranch(cat));
      }
    } else {
      out.push(r);
    }
  }
  return out;
}

function findUslugeRoot(roots: PublicNavItem[]): PublicNavItem | null {
  return roots.find((r) => looksLikeUslugeParent(r)) ?? null;
}

function findGroupParentUnderUsluge(
  usluge: PublicNavItem,
  groupKey: string,
): PublicNavItem | null {
  for (const child of usluge.children) {
    if (matchNavNodeToUslugeGroupKey(child) === groupKey) {
      return child;
    }
  }
  return null;
}

function sortChildrenByLabel(node: PublicNavItem) {
  node.children.sort((a, b) =>
    normNavLabel(a.label).localeCompare(normNavLabel(b.label), "sr"),
  );
}

export type CmsNavPageEntry = {
  item: PublicNavItem;
  /** Prazno string — direktno pod „Uslugama“ (nakon grupa). */
  groupKey: string;
};

/**
 * Umetne CMS stranice pod postojeće „Usluge“ prema header_nav_group.
 * Ne duplira href-ove iz existingHrefs.
 */
export function attachCmsPagesUnderUsluge(
  roots: PublicNavItem[],
  entries: CmsNavPageEntry[],
  existingHrefs: Set<string>,
  normHref: (h: string) => string,
): void {
  if (entries.length === 0) return;

  const usluge = findUslugeRoot(roots);
  if (!usluge) {
    return;
  }

  const directUnderUsluge: PublicNavItem[] = [];

  for (const { item, groupKey } of entries) {
    if (existingHrefs.has(normHref(item.href))) continue;

    if (!groupKey) {
      directUnderUsluge.push(item);
      continue;
    }

    const parent = findGroupParentUnderUsluge(usluge, groupKey);
    if (!parent) {
      directUnderUsluge.push(item);
      continue;
    }
    parent.children.push({ ...item, children: [] });
    existingHrefs.add(normHref(item.href));
  }

  for (const item of directUnderUsluge) {
    if (existingHrefs.has(normHref(item.href))) continue;
    usluge.children.push({ ...item, children: [] });
    existingHrefs.add(normHref(item.href));
  }

  for (const child of usluge.children) {
    if (child.children.length > 0) sortChildrenByLabel(child);
  }
}
