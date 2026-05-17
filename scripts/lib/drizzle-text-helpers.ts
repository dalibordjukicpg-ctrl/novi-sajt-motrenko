/**
 * Usklađivanje tekstualnih vrijednosti sa Drizzle šemom (nullable `text` vs obavezni string).
 */

/** Nullable `text` / `longText` kolone: `null`, `""` ili whitespace → `null`. */
export function textOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.trim() === "" ? null : value;
}

/** Obavezni `varchar` naslov: prazno → fallback (npr. slug). */
export function titleOrFallback(title: string, fallback: string): string {
  const t = title.trim();
  return t.length > 0 ? t : fallback;
}
