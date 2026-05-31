import { existsSync } from "fs";
import path from "path";

import {
  FALLBACK_HERO_VIDEO_MOBILE_REL,
  FALLBACK_HERO_VIDEO_PATH_REL,
  FALLBACK_HERO_VIDEO_POSTER_REL,
} from "@/lib/clinic-assets";
import {
  isHeroBackgroundVideoUrl,
  isHeroBackgroundYoutubeUrl,
} from "@/lib/hero-background-media";

export { FALLBACK_HERO_VIDEO_PATH_REL };

const FALLBACK_FILENAMES = ["nova-beba.mp4", "hero-banner.mp4"] as const;

const VIDEO_DIR = path.join(process.cwd(), "public", "video");

function publicVideoExists(relativePath: string): boolean {
  const rel = relativePath.replace(/^\/video\//, "");
  return existsSync(path.join(VIDEO_DIR, rel));
}

export type HeroVideoAssets = {
  /** Desktop / default MP4 URL. */
  src: string;
  /** Manja verzija za mobilne (ako postoji). */
  mobileSrc: string | null;
  /** Poster slika — prikazuje se odmah pri učitavanju. */
  posterSrc: string | null;
};

export function resolveHeroBackgroundUrl(fromDb: string | null | undefined): string | null {
  const u = fromDb?.trim();
  if (u && (isHeroBackgroundVideoUrl(u) || isHeroBackgroundYoutubeUrl(u))) return u;
  for (const name of FALLBACK_FILENAMES) {
    const abs = path.join(VIDEO_DIR, name);
    if (existsSync(abs)) return `/video/${name}`;
  }
  return null;
}

/** Poster + mobilna varijanta za poznate lokalne hero video fajlove. */
export function resolveHeroVideoAssets(videoUrl: string | null | undefined): HeroVideoAssets | null {
  const u = videoUrl?.trim();
  if (!u || !isHeroBackgroundVideoUrl(u)) return null;

  if (u === FALLBACK_HERO_VIDEO_PATH_REL) {
    return {
      src: u,
      mobileSrc: publicVideoExists(FALLBACK_HERO_VIDEO_MOBILE_REL)
        ? FALLBACK_HERO_VIDEO_MOBILE_REL
        : null,
      posterSrc: publicVideoExists(FALLBACK_HERO_VIDEO_POSTER_REL)
        ? FALLBACK_HERO_VIDEO_POSTER_REL
        : null,
    };
  }

  const localMatch = u.match(/^\/video\/(.+)\.mp4$/i);
  if (localMatch) {
    const base = localMatch[1];
    const poster = `/video/${base}-poster.jpg`;
    const mobile = `/video/${base}-720.mp4`;
    return {
      src: u,
      mobileSrc: publicVideoExists(mobile) ? mobile : null,
      posterSrc: publicVideoExists(poster) ? poster : null,
    };
  }

  return { src: u, mobileSrc: null, posterSrc: null };
}
