import fs from "fs";
import path from "path";

/** Apsolutna putanja za lokalni fajl u `public/uploads/` ili `public/wp-media/`. */
export function localPublicMediaAbsPath(storageKey: string): string | null {
  const k = storageKey.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!k || k.includes("..") || /^https?:\/\//i.test(k)) return null;
  if (!k.startsWith("uploads/") && !k.startsWith("wp-media/")) return null;
  return path.join(process.cwd(), "public", ...k.split("/"));
}

export function mediaFileExistsOnDisk(storageKey: string): boolean {
  const abs = localPublicMediaAbsPath(storageKey);
  if (!abs) return true;
  return fs.existsSync(abs);
}
