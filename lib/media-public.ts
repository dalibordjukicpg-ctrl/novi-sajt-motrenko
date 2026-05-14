/** Javni URL fajla iz kolone `media.storage_key` (relativna putanja ili pun URL). */
export function publicUrlFromMediaStorageKey(storageKey: string): string {
  const k = storageKey.trim();
  if (!k) return "";
  if (k.startsWith("http://") || k.startsWith("https://")) return k;
  const baseRaw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const base = baseRaw.replace(/\/+$/, "");
  if (!base) return `/${k.replace(/^\/+/, "")}`;
  return `${base}/${k.replace(/^\/+/, "")}`;
}
