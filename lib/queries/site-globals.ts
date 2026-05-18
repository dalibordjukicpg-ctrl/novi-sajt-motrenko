import { cache } from "react";

import { eq } from "drizzle-orm";

import { clientIpBypassesMaintenance } from "@/lib/maintenance-bypass-ips";
import { db } from "@/lib/db";
import { media, siteGlobals } from "@/lib/db/schema";
import {
  DR_MOTRENKO_PORTRAIT,
  TEAM_HOME_PORTRAIT_FALLBACKS,
} from "@/lib/clinic-assets";
import { publicUrlFromMediaStorageKey } from "@/lib/media-public";
import { parseYoutubeEmbedUrl } from "@/lib/youtube-hero";

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
    const external = (g.heroBgExternalUrl ?? "").trim();
    const externalResolved = external
      ? (parseYoutubeEmbedUrl(external) ?? external)
      : null;

    const [logoUrl, faviconUrl, heroBgFromMedia] = await Promise.all([
      resolveMediaPublicUrl(g.logoMediaId),
      resolveMediaPublicUrl(g.faviconMediaId),
      resolveMediaPublicUrl(g.heroBgMediaId),
    ]);

    const heroBgUrl = externalResolved || heroBgFromMedia;
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

const TEAM_FALLBACK_PORTRAITS = [...TEAM_HOME_PORTRAIT_FALLBACKS];

/** Javni URL za veliki portret u bloku „tim“ na početnoj (`team_m1_media_id`); ostali slotovi u bazi su zastarjeli. */
export const getTeamHomePortraitUrls = cache(async (): Promise<string[]> => {
  try {
    const g = await getSiteGlobalsRow();
    const fb = [...TEAM_FALLBACK_PORTRAITS];
    const primary = await resolveMediaPublicUrl(g?.teamM1MediaId);
    const first = primary ?? fb[0] ?? DR_MOTRENKO_PORTRAIT;
    return [
      first,
      fb[1] ?? DR_MOTRENKO_PORTRAIT,
      fb[2] ?? DR_MOTRENKO_PORTRAIT,
      fb[3] ?? DR_MOTRENKO_PORTRAIT,
    ];
  } catch (e) {
    console.error("[getTeamHomePortraitUrls]", e);
    return [...TEAM_FALLBACK_PORTRAITS];
  }
});

export type MaintenancePublicState =
  | { active: false }
  | {
      active: true;
      title: string;
      message: string;
      logoUrl: string | null;
    };

/** Režim održavanja za javni sajt (`/[locale]/…`). Admin rute nisu pod ovim layoutom.
 *  `clientIp`: adresa posjetioca (npr. iz `getRequestClientIp()`); nije keširano po IP. */
export async function getMaintenancePublicStateForRequest(
  clientIp: string,
): Promise<MaintenancePublicState> {
  try {
    const row = await getSiteGlobalsRow();
    if (!row?.maintenanceEnabled) {
      return { active: false };
    }
    if (clientIpBypassesMaintenance(clientIp, row.maintenanceBypassIps)) {
      return { active: false };
    }
    const title =
      (row.maintenanceTitle ?? "").trim() || "Radimo na poboljšanju sajta";
    const message =
      (row.maintenanceMessage ?? "").trim() ||
      "Trenutno renoviramo veb prezentaciju. Uskoro se vraćamo — hvala na strpljenju.";
    const logoId =
      row.maintenanceLogoMediaId?.trim() || row.logoMediaId || null;
    const logoUrl = logoId ? await resolveMediaPublicUrl(logoId) : null;
    return { active: true, title, message, logoUrl };
  } catch (e) {
    console.error("[getMaintenancePublicStateForRequest]", e);
    return { active: false };
  }
}
