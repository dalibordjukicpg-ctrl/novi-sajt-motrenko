import fs from "fs";
import path from "path";

/** Van deploy foldera na Hostingeru — commit/deploy ne briše uploadane slike. */
export function getUploadsRootDir(): string {
  const env = process.env.MEDIA_UPLOADS_DIR?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
  }

  if (process.env.NODE_ENV === "production") {
    return path.join(process.cwd(), "..", "private", "uploads");
  }

  return path.join(process.cwd(), "public", "uploads");
}

export function localUploadAbsPathFromStorageKey(storageKey: string): string | null {
  const k = storageKey.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!k || k.includes("..") || /^https?:\/\//i.test(k)) return null;
  if (!k.startsWith("uploads/")) return null;
  const rel = k.slice("uploads/".length);
  if (!rel) return null;
  return path.join(getUploadsRootDir(), ...rel.split("/"));
}

export function ensureUploadsRootDir(): string {
  const root = getUploadsRootDir();
  fs.mkdirSync(root, { recursive: true });
  return root;
}
