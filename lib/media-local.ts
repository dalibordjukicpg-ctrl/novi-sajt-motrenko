import fs from "fs";
import path from "path";

import {
  getUploadsRootDir,
  localUploadAbsPathFromStorageKey,
} from "@/lib/media-storage-path";

export { getUploadsRootDir, localUploadAbsPathFromStorageKey };

/** Apsolutna putanja za lokalni fajl (`uploads/…` ili `public/wp-media/…`). */
export function localPublicMediaAbsPath(storageKey: string): string | null {
  const k = storageKey.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!k || k.includes("..") || /^https?:\/\//i.test(k)) return null;
  if (k.startsWith("uploads/")) {
    return localUploadAbsPathFromStorageKey(k);
  }
  if (k.startsWith("wp-media/")) {
    return path.join(process.cwd(), "public", ...k.split("/"));
  }
  return null;
}

export function mediaFileExistsOnDisk(storageKey: string): boolean {
  const abs = localPublicMediaAbsPath(storageKey);
  if (!abs) return true;
  return fs.existsSync(abs);
}
