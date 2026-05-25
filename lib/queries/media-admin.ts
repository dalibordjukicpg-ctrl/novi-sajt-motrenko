import { desc, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { media, mediaAltTranslations } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { isLocale, locales } from "@/lib/i18n";
import { mediaFileExistsOnDisk } from "@/lib/media-local";
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
  fileExists: boolean;
  altByLocale: Record<Locale, string>;
};

function emptyAltByLocale(): Record<Locale, string> {
  return Object.fromEntries(locales.map((l) => [l, ""])) as Record<
    Locale,
    string
  >;
}

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
    altMap.set(id, emptyAltByLocale());
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
    fileExists: mediaFileExistsOnDisk(m.storageKey),
    altByLocale: altMap.get(m.id) ?? emptyAltByLocale(),
  }));
}

export type MediaOption = {
  id: string;
  label: string;
  url: string;
  mimeType: string;
  fileMissing?: boolean;
};

export async function listMediaOptions(): Promise<MediaOption[]> {
  const rows = await db
    .select({
      id: media.id,
      filename: media.filename,
      storageKey: media.storageKey,
      mimeType: media.mimeType,
    })
    .from(media)
    .orderBy(desc(media.createdAt));
  return rows.map((r) => ({
    id: r.id,
    label: `${r.filename}${r.mimeType.startsWith("video/") ? " (video)" : ""}`,
    url: publicUrlFromMediaStorageKey(r.storageKey),
    mimeType: r.mimeType,
    fileMissing: !mediaFileExistsOnDisk(r.storageKey),
  }));
}
