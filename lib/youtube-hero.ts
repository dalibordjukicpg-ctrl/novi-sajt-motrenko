/** YouTube / youtu.be → embed URL za hero pozadinu. */
export function parseYoutubeEmbedUrl(raw: string): string | null {
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
