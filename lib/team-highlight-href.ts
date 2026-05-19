/** Izvlači CMS slug iz putanje kartice (npr. `/s/tim-individualan-pristup`). */
export function slugFromTeamHighlightHref(href: string): string | null {
  const m = href.trim().match(/\/s\/([^/?#]+)/i);
  return m?.[1]?.toLowerCase() ?? null;
}

/** Predloženi slug za novu stranicu tima. */
export function suggestTeamHighlightPageSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base ? `tim-${base}` : "tim-nova-stranica";
}
