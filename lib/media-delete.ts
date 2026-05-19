import path from "path";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { media, posts, siteGlobals } from "@/lib/db/schema";
import { SITE_GLOBALS_ROW_ID } from "@/lib/queries/site-globals";

export type MediaUsageRef = {
  kind: "post_cover" | "site_logo" | "site_favicon" | "site_hero" | "site_team" | "site_maintenance_logo";
  label: string;
};

const GLOBALS_FIELD_LABELS: {
  column: keyof typeof siteGlobals.$inferSelect;
  kind: MediaUsageRef["kind"];
  label: string;
}[] = [
  { column: "logoMediaId", kind: "site_logo", label: "Logo sajta" },
  { column: "faviconMediaId", kind: "site_favicon", label: "Favicon" },
  { column: "heroBgMediaId", kind: "site_hero", label: "Hero pozadina" },
  { column: "teamM1MediaId", kind: "site_team", label: "Tim na početnoj (portret)" },
  { column: "teamM2MediaId", kind: "site_team", label: "Tim na početnoj (slot 2)" },
  { column: "teamM3MediaId", kind: "site_team", label: "Tim na početnoj (slot 3)" },
  { column: "teamM4MediaId", kind: "site_team", label: "Tim na početnoj (slot 4)" },
  {
    column: "maintenanceLogoMediaId",
    kind: "site_maintenance_logo",
    label: "Logo ekrana održavanja",
  },
];

export async function listMediaUsageRefs(mediaId: string): Promise<MediaUsageRef[]> {
  const refs: MediaUsageRef[] = [];

  const postRows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.coverMediaId, mediaId))
    .limit(20);
  if (postRows.length > 0) {
    const n = postRows.length;
    refs.push({
      kind: "post_cover",
      label:
        n === 1
          ? "Naslovna slika jednog članka/objave"
          : `Naslovna slika na ${n} članaka/objava`,
    });
  }

  const [g] = await db
    .select()
    .from(siteGlobals)
    .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID))
    .limit(1);
  if (g) {
    for (const f of GLOBALS_FIELD_LABELS) {
      if (g[f.column] === mediaId) {
        refs.push({ kind: f.kind, label: f.label });
      }
    }
  }

  return refs;
}

/** Ukloni ID medija iz globalnih podešavanja (posts.cover se null-ira FK-om pri brisanju). */
export async function clearMediaIdFromSiteGlobals(mediaId: string): Promise<void> {
  const [g] = await db
    .select()
    .from(siteGlobals)
    .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID))
    .limit(1);
  if (!g) return;

  await db
    .update(siteGlobals)
    .set({
      logoMediaId: g.logoMediaId === mediaId ? null : g.logoMediaId,
      faviconMediaId: g.faviconMediaId === mediaId ? null : g.faviconMediaId,
      heroBgMediaId: g.heroBgMediaId === mediaId ? null : g.heroBgMediaId,
      teamM1MediaId: g.teamM1MediaId === mediaId ? null : g.teamM1MediaId,
      teamM2MediaId: g.teamM2MediaId === mediaId ? null : g.teamM2MediaId,
      teamM3MediaId: g.teamM3MediaId === mediaId ? null : g.teamM3MediaId,
      teamM4MediaId: g.teamM4MediaId === mediaId ? null : g.teamM4MediaId,
      maintenanceLogoMediaId:
        g.maintenanceLogoMediaId === mediaId ? null : g.maintenanceLogoMediaId,
      updatedAt: new Date(),
    })
    .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID));
}

/** Apsolutna putanja samo za lokalne fajlove u `public/uploads/`. */
export function localUploadAbsPath(storageKey: string): string | null {
  const k = storageKey.trim();
  if (!k || /^https?:\/\//i.test(k)) return null;
  const normalized = k.replace(/^\/+/, "").replace(/\\/g, "/");
  if (normalized.includes("..")) return null;
  if (!normalized.startsWith("uploads/")) return null;
  return path.join(process.cwd(), "public", ...normalized.split("/"));
}

export async function getMediaRowForDelete(mediaId: string) {
  const [row] = await db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      filename: media.filename,
    })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);
  return row ?? null;
}
