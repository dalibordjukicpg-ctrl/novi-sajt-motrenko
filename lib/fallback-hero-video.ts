import { existsSync } from "fs";
import path from "path";

/**
 * Statički hero video u repou (`public/video/nova-beba.mp4`), ako CMS nema pozadinu.
 * Ostaje `hero-banner.mp4` kao rezerva ako novi fajl nedostaje.
 */
export const FALLBACK_HERO_VIDEO_PATH_REL = "/video/nova-beba.mp4";

const FALLBACK_FILENAMES = ["nova-beba.mp4", "hero-banner.mp4"] as const;

export function resolveHeroBackgroundUrl(fromDb: string | null | undefined): string | null {
  const u = fromDb?.trim();
  if (u) return u;
  for (const name of FALLBACK_FILENAMES) {
    const abs = path.join(process.cwd(), "public", "video", name);
    if (existsSync(abs)) return `/video/${name}`;
  }
  return null;
}
