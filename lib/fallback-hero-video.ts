import { existsSync } from "fs";
import path from "path";

import { FALLBACK_HERO_VIDEO_PATH_REL } from "@/lib/clinic-assets";
import {
  isHeroBackgroundVideoUrl,
  isHeroBackgroundYoutubeUrl,
} from "@/lib/hero-background-media";

export { FALLBACK_HERO_VIDEO_PATH_REL };

const FALLBACK_FILENAMES = ["nova-beba.mp4", "hero-banner.mp4"] as const;

export function resolveHeroBackgroundUrl(fromDb: string | null | undefined): string | null {
  const u = fromDb?.trim();
  if (u && (isHeroBackgroundVideoUrl(u) || isHeroBackgroundYoutubeUrl(u))) return u;
  for (const name of FALLBACK_FILENAMES) {
    const abs = path.join(process.cwd(), "public", "video", name);
    if (existsSync(abs)) return `/video/${name}`;
  }
  return null;
}
