/**
 * Jednokratno (poslije import:wordpress / ručnog menija): sve WP grupe usluga u headeru
 * spaja u jedan roditelj „Usluge“ sa ravnom listom stvarnih linkova (listovi menija).
 *
 * • Prepoznaje grupe isključivo po labeli (normalized), ne po WP ID-ju.
 * • Briše prazne posredničke čvorove u podstablu (naslovi ostaju samo na listovima).
 * • Ako „Usluge“ ne postoji kao header korijen, kreira ga.
 *
 * Pokretanje:
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/collapse-header-usluge.ts
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/collapse-header-usluge.ts --dry-run
 */
import "./load-dotenv";

import { randomUUID } from "crypto";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "../lib/db";
import { navLinkTranslations, navLinks } from "../lib/db/schema";
import { locales } from "../lib/i18n";

function normLabel(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** WP / ručni meni: top-level grupe koje treba sklopiti pod „Usluge“. */
function isServiceGroupRootLabel(label: string): boolean {
  const n = normLabel(label);
  if (n.length < 4) return false;
  if (n === "o nama" || n.startsWith("o nama")) return false;
  if (n === "blog" || n === "kontakt" || n.includes("instagram") || n.includes("facebook"))
    return false;
  if (n.includes("nas tim") || n.includes("naš tim") || n === "tim") return false;

  if (n.includes("infertilitet") && n.includes("sterilitet")) return true;
  if (n.includes("iui") && n.includes("ivf")) return true;
  if (n === "ginekologija") return true;
  if (n.includes("trudnoc")) return true;
  if (n.includes("prezervacija") && n.includes("fertilnost")) return true;
  return false;
}

function isUslugeRootLabel(label: string): boolean {
  return normLabel(label) === "usluge";
}

function sortedChildren(
  parentId: string | null,
  byParent: Map<string | null, string[]>,
  sortKey: Map<string, number>,
): string[] {
  const list = [...(byParent.get(parentId) ?? [])];
  list.sort((a, b) => (sortKey.get(a) ?? 0) - (sortKey.get(b) ?? 0) || a.localeCompare(b));
  return list;
}

/** Samo listovi (čvorovi bez djece u trenutnom stablu) — prave stranice / linkovi. */
function collectLeafIds(
  rootId: string,
  byParent: Map<string | null, string[]>,
  sortKey: Map<string, number>,
): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    const ch = sortedChildren(id, byParent, sortKey);
    if (ch.length === 0) {
      out.push(id);
      return;
    }
    for (const c of ch) walk(c);
  };
  walk(rootId);
  return out;
}

function subtreeAllIds(
  rootId: string,
  byParent: Map<string | null, string[]>,
): Set<string> {
  const s = new Set<string>();
  const walk = (id: string) => {
    if (s.has(id)) return;
    s.add(id);
    for (const c of byParent.get(id) ?? []) walk(c);
  };
  walk(rootId);
  return s;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const rows = await db
    .select()
    .from(navLinks)
    .where(eq(navLinks.placement, "header"))
    .orderBy(asc(navLinks.sortOrder), asc(navLinks.id));

  if (rows.length === 0) {
    console.log("Nema header stavki u nav_links — ništa za raditi.");
    return;
  }

  const ids = rows.map((r) => r.id);
  const trans = await db
    .select()
    .from(navLinkTranslations)
    .where(inArray(navLinkTranslations.navLinkId, ids));

  const labelMe = new Map<string, string>();
  for (const t of trans) {
    if (t.locale === "me") labelMe.set(t.navLinkId, t.label);
  }

  const sortKey = new Map<string, number>();
  const byParent = new Map<string | null, string[]>();
  for (const r of rows) {
    sortKey.set(r.id, r.sortOrder);
    const p = r.parentId;
    const list = byParent.get(p) ?? [];
    list.push(r.id);
    byParent.set(p, list);
  }

  const headerRootIds = rows
    .filter((r) => r.parentId == null)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || String(a.id).localeCompare(String(b.id)),
    )
    .map((r) => r.id);

  let uslugeId = headerRootIds.find((id) => isUslugeRootLabel(labelMe.get(id) ?? ""));

  const serviceRootIds = headerRootIds.filter(
    (id) => id !== uslugeId && isServiceGroupRootLabel(labelMe.get(id) ?? ""),
  );

  if (serviceRootIds.length === 0) {
    console.log(
      "Nema prepoznatljivih grupa usluga u header korijenima (Infertilitet…, IUI/IVF, …) — vjerovatno je meni već sklopljen ili prazan.",
    );
    return;
  }

  serviceRootIds.sort((a, b) => (sortKey.get(a) ?? 0) - (sortKey.get(b) ?? 0));

  const leafIdsOrdered: string[] = [];
  const seen = new Set<string>();
  for (const rootId of serviceRootIds) {
    for (const leaf of collectLeafIds(rootId, byParent, sortKey)) {
      if (seen.has(leaf)) continue;
      seen.add(leaf);
      leafIdsOrdered.push(leaf);
    }
  }

  const toDelete = new Set<string>();
  for (const rootId of serviceRootIds) {
    const all = subtreeAllIds(rootId, byParent);
    const leaves = new Set(collectLeafIds(rootId, byParent, sortKey));
    for (const id of all) {
      if (id === rootId) {
        toDelete.add(id);
        continue;
      }
      if (!leaves.has(id)) toDelete.add(id);
    }
  }

  if (uslugeId) {
    const oldKids = sortedChildren(uslugeId, byParent, sortKey);
    for (const id of oldKids) {
      if (!leafIdsOrdered.includes(id)) toDelete.add(id);
    }
  }

  console.log("--- collapse-header-usluge ---");
  console.log("Dry run:", dryRun);
  console.log("Grupe za sklapanje:", serviceRootIds.length);
  for (const id of serviceRootIds) {
    console.log("  •", JSON.stringify(labelMe.get(id) ?? "(bez labele)"));
  }
  console.log("Listovi (stavke pod „Usluge“):", leafIdsOrdered.length);
  console.log("Čvorovi za brisanje (grupe + posrednici):", toDelete.size);

  if (dryRun) return;

  await db.transaction(async (tx) => {
    const now = new Date();

    if (!uslugeId) {
      uslugeId = randomUUID();
      const baseOrder =
        Math.min(
          ...serviceRootIds.map((id) => sortKey.get(id) ?? 9999),
          10,
        ) - 5;
      await tx.insert(navLinks).values({
        id: uslugeId,
        parentId: null,
        sortOrder: baseOrder > 0 ? baseOrder : 5,
        href: "#usluge",
        visible: true,
        placement: "header",
        footerColumn: 0,
        updatedAt: now,
      });
      for (const loc of locales) {
        await tx.insert(navLinkTranslations).values({
          id: randomUUID(),
          navLinkId: uslugeId!,
          locale: loc,
          label: "Usluge",
        });
      }
      console.log("Kreiran korijen „Usluge“:", uslugeId);
    }

    let order = 10;
    for (const leafId of leafIdsOrdered) {
      await tx
        .update(navLinks)
        .set({
          parentId: uslugeId,
          sortOrder: order,
          placement: "header",
          footerColumn: 0,
          updatedAt: now,
        })
        .where(eq(navLinks.id, leafId));
      order += 10;
    }

    const deleteIds = [...toDelete].filter((id) => !leafIdsOrdered.includes(id));
    if (deleteIds.length > 0) {
      await tx.delete(navLinks).where(inArray(navLinks.id, deleteIds));
    }

    console.log("Gotovo. Pod „Usluge“ vezano linkova:", leafIdsOrdered.length);
    console.log("Obrisano starih čvorova:", deleteIds.length);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
