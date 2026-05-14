import { cache } from "react";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { media, siteGlobals } from "@/lib/db/schema";
import { publicUrlFromMediaStorageKey } from "@/lib/media-public";

export const SITE_GLOBALS_ROW_ID = "singleton" as const;

export type SiteGlobalsRow = typeof siteGlobals.$inferSelect;

export async function getSiteGlobalsRow(): Promise<SiteGlobalsRow | null> {
  const [row] = await db
    .select()
    .from(siteGlobals)
    .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID))
    .limit(1);
  return row ?? null;
}

export async function resolveMediaPublicUrl(
  mediaId: string | null | undefined,
): Promise<string | null> {
  if (!mediaId) return null;
  const [m] = await db
    .select({ storageKey: media.storageKey })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);
  if (!m) return null;
  const u = publicUrlFromMediaStorageKey(m.storageKey);
  return u || null;
}

export const getSiteBranding = cache(async () => {
  try {
    const g = await getSiteGlobalsRow();
    if (!g) {
      return {
        logoUrl: null as string | null,
        faviconUrl: null as string | null,
        heroBgUrl: null as string | null,
        analyticsHeadHtml: "",
        analyticsBodyHtml: "",
      };
    }
    const [logoUrl, faviconUrl, heroBgUrl] = await Promise.all([
      resolveMediaPublicUrl(g.logoMediaId),
      resolveMediaPublicUrl(g.faviconMediaId),
      resolveMediaPublicUrl(g.heroBgMediaId),
    ]);
    return {
      logoUrl,
      faviconUrl,
      heroBgUrl,
      analyticsHeadHtml: g.analyticsHeadHtml ?? "",
      analyticsBodyHtml: g.analyticsBodyHtml ?? "",
    };
  } catch (e) {
    console.error("[getSiteBranding]", e);
    return {
      logoUrl: null,
      faviconUrl: null,
      heroBgUrl: null,
      analyticsHeadHtml: "",
      analyticsBodyHtml: "",
    };
  }
});
