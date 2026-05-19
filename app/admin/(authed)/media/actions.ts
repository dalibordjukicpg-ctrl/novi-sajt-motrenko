"use server";

import { unlink } from "fs/promises";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import {
  clearMediaIdFromSiteGlobals,
  getMediaRowForDelete,
  listMediaUsageRefs,
  localUploadAbsPath,
} from "@/lib/media-delete";
import { revalidatePublicSite } from "@/lib/revalidate-content";

function revalidateAfterMediaDelete(): void {
  revalidatePublicSite();
  revalidatePath("/admin/media");
  revalidatePath(adminPath("media"));
  revalidatePath("/admin/settings");
  revalidatePath(adminPath("settings"));
  revalidatePath("/admin/content/hero");
  revalidatePath(adminPath("content/hero"));
  revalidatePath("/admin/content/sections");
  revalidatePath(adminPath("content/sections"));
  revalidatePath("/admin/posts");
  revalidatePath(adminPath("posts"));
}

export async function deleteMediaAction(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; cleared?: string[] }> {
  const session = await getSession();
  if (!session) return { error: "Niste prijavljeni." };
  if (!hasPermission(session.role, PERMISSIONS.MEDIA_MANAGE)) {
    return { error: "Nemate dozvolu za brisanje medija." };
  }

  const mediaId = String(formData.get("mediaId") ?? "").trim();
  if (mediaId.length !== 36) {
    return { error: "Neispravan ID medija." };
  }

  const row = await getMediaRowForDelete(mediaId);
  if (!row) return { error: "Medij nije pronađen (već obrisan?)." };

  const usage = await listMediaUsageRefs(mediaId);
  const clearedLabels = usage.map((u) => u.label);

  try {
    await clearMediaIdFromSiteGlobals(mediaId);
    await db.delete(media).where(eq(media.id, mediaId));

    const abs = localUploadAbsPath(row.storageKey);
    if (abs) {
      try {
        await unlink(abs);
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
          console.warn("[deleteMedia] unlink failed:", abs, e);
        }
      }
    }

    revalidateAfterMediaDelete();
    return { ok: true, cleared: clearedLabels.length > 0 ? clearedLabels : undefined };
  } catch (e) {
    console.error(e);
    return { error: "Brisanje nije uspjelo." };
  }
}
