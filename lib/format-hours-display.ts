/**
 * U CMS tekstu ponekad stoji "08-00" umjesto "08:00" — ujednačava prikaz radnog vremena.
 */
export function formatHoursDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.replace(/\b(\d{1,2})-(\d{2})\b/g, (__, h, m) => {
    const hh = h.length === 1 ? `0${h}` : h;
    return `${hh}:${m}`;
  });
}
