"use server";

import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";

import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { ensureUploadsRootDir, localUploadAbsPathFromStorageKey } from "@/lib/media-storage-path";

const MAX_BYTES = 8 * 1024 * 1024;

export async function uploadEditorImageAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Niste prijavljeni." };
  if (!hasPermission(session.role, PERMISSIONS.MEDIA_MANAGE)) {
    return { error: "Nemate dozvolu za otpremanje." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Nedostaje fajl." };
  if (!file.type.startsWith("image/")) {
    return { error: "Dozvoljene su samo slike." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return { error: "Slika je prevelika." };

  const orig = file.name || "image";
  const ext = path.extname(orig).slice(0, 12) || ".jpg";
  const name = `${randomUUID()}${ext}`;
  const rel = `uploads/${name}`;
  const absFile = localUploadAbsPathFromStorageKey(rel);

  if (!absFile) return { error: "Neispravna putanja." };

  try {
    await ensureUploadsRootDir();
    await writeFile(absFile, buf);
  } catch (e) {
    console.error(e);
    return { error: "Snimanje nije uspjelo." };
  }

  return { url: `/${rel}` };
}
