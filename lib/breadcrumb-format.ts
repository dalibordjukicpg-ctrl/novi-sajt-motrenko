/** Naslov u breadcrumbu — npr. „O NAMA“ → „O nama“, zadržava kratke riječi (O, Na). */
export function formatBreadcrumbLabel(label: string): string {
  const t = label.trim();
  if (!t) return t;

  const isAllCaps =
    t === t.toUpperCase() && /[A-ZČĆŽŠĐ]/.test(t) && t.length > 2;
  if (!isAllCaps) return t;

  return t
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 2) return word;
      const lower = word.toLocaleLowerCase("sr-Latn");
      return lower.charAt(0).toLocaleUpperCase("sr-Latn") + lower.slice(1);
    })
    .join(" ");
}
