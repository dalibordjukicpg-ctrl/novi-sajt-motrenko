import { desc, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { media, mediaAltTranslations } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import { publicUrlFromMediaStorageKey } from "@/lib/media-public";

export type MediaAdminRow = {
  id: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  publicUrl: string;
  altByLocale: Record<Locale, string>;
};

export async function listMediaForAdmin(): Promise<MediaAdminRow[]> {
  const items = await db
    .select()
    .from(media)
    .orderBy(desc(media.createdAt));

  if (items.length === 0) return [];

  const ids = items.map((m) => m.id);
  const altRows = await db
    .select({
      mediaId: mediaAltTranslations.mediaId,
      locale: mediaAltTranslations.locale,
      altText: mediaAltTranslations.altText,
    })
    .from(mediaAltTranslations)
    .where(inArray(mediaAltTranslations.mediaId, ids));

  const altMap = new Map<string, Record<Locale, string>>();
  for (const id of ids) {
    altMap.set(id, { me: "", en: "", ru: "", tr: "" });
  }
  for (const r of altRows) {
    const loc = r.locale;
    if (!isLocale(loc)) continue;
    const rec = altMap.get(r.mediaId);
    if (rec) rec[loc] = r.altText;
  }

  return items.map((m) => ({
    id: m.id,
    filename: m.filename,
    storageKey: m.storageKey,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    width: m.width,
    height: m.height,
    publicUrl: publicUrlFromMediaStorageKey(m.storageKey),
    altByLocale: altMap.get(m.id) ?? {
      me: "",
      en: "",
      ru: "",
      tr: "",
    },
  }));
}

export type MediaOption = { id: string; label: string; url: string };

export async function listMediaOptions(): Promise<MediaOption[]> {
  const rows = await db
    .select({
      id: media.id,
      filename: media.filename,
      storageKey: media.storageKey,
    })
    .from(media)
    .orderBy(desc(media.createdAt));
  return rows.map((r) => ({
    id: r.id,
    label: r.filename,
    url: publicUrlFromMediaStorageKey(r.storageKey),
  }));
}
