/** 11-znakovni ID — hvata i WP šum tipa `nhttps://youtu.be/XXXXXXXXXXXn`. */
const YOUTUBE_VIDEO_ID_IN_TEXT_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;

export function extractYoutubeVideoIdFromNoisyText(raw: string): string | null {
  const m = raw.match(YOUTUBE_VIDEO_ID_IN_TEXT_RE);
  return m?.[1] ?? null;
}

/** Pronađi embed URL čak i kad je link okružen WP „n“ artefaktima. */
export function findYoutubeEmbedInNoisyText(raw: string): string | null {
  const id = extractYoutubeVideoIdFromNoisyText(raw);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** YouTube / youtu.be → embed URL za hero pozadinu. */
export function parseYoutubeEmbedUrl(raw: string): string | null {
  const fromNoise = findYoutubeEmbedInNoisyText(raw);
  if (fromNoise) return fromNoise;

  const u = raw.trim();
  if (!u) return null;
  try {
    const url = u.startsWith("http") ? new URL(u) : new URL(`https://${u}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) return url.toString();
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const shorts = url.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function isYoutubeUrl(raw: string): boolean {
  return parseYoutubeEmbedUrl(raw) != null;
}

export function isYoutubeEmbedUrl(url: string): boolean {
  return /youtube\.com\/embed\//i.test(url.trim());
}
