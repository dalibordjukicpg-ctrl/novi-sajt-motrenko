import { isYoutubeEmbedUrl } from "@/lib/youtube-hero";

/** Ekstenzije za `<video>` u hero pozadini (`backgroundType="auto"`). */
export const HERO_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

export function isHeroBackgroundVideoUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (isYoutubeEmbedUrl(u)) return false;
  return HERO_VIDEO_EXTENSIONS.test(u);
}

export function isHeroBackgroundYoutubeUrl(url: string): boolean {
  return isYoutubeEmbedUrl(url.trim());
}
