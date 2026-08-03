/** Vertikalni fokus u object-position (0 = vrh, 50 = centar, 100 = dno). */
export function clampImageFocusY(value: unknown, fallback = 50): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function objectPositionFromFocusY(focusY: unknown): string {
  return `center ${clampImageFocusY(focusY)}%`;
}

/** TipTap / HTML atribut za body slike. */
export const IMAGE_FOCUS_Y_ATTR = "data-object-position-y";

/**
 * Nakon sanitize (koji skida style), vrati object-position iz data atributa.
 */
export function applyImageFocusStylesFromDataAttrs(html: string): string {
  if (!html) return html;
  return html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const m = new RegExp(
      `\\b${IMAGE_FOCUS_Y_ATTR}\\s*=\\s*(["'])(\\d{1,3})\\1`,
      "i",
    ).exec(attrs);
    if (!m) return full;
    const y = clampImageFocusY(m[2]);
    const pos = objectPositionFromFocusY(y);
    if (/\bstyle\s*=/i.test(attrs)) {
      const nextAttrs = attrs.replace(
        /\bstyle\s*=\s*(["'])(.*?)\1/i,
        (_s, q: string, style: string) => {
          const cleaned = style
            .replace(/object-position\s*:[^;]+;?/gi, "")
            .trim()
            .replace(/;?\s*$/, "");
          const merged = cleaned
            ? `object-position: ${pos}; ${cleaned}`
            : `object-position: ${pos}`;
          return `style=${q}${merged}${q}`;
        },
      );
      return `<img${nextAttrs}>`;
    }
    return `<img${attrs} style="object-position: ${pos}">`;
  });
}
