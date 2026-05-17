"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/auth";
import { revalidatePublicSite } from "@/lib/revalidate-content";

export type ClearCacheState = { ok: boolean; message: string } | null;

function revalidateAdminSurface(): void {
  const paths = [
    "/admin",
    "/admin/users",
    "/admin/audit",
    "/admin/analytics",
    "/admin/bookings",
    "/admin/posts",
    "/admin/posts/new",
    "/admin/pages",
    "/admin/media",
    "/admin/settings",
    "/admin/site",
    "/admin/content/header",
    "/admin/content/header-footer",
    "/admin/content/hero",
    "/admin/content/sections",
  ] as const;
  for (const p of paths) {
    revalidatePath(p);
  }
}

/**
 * Prazni Next.js data cache putem revalidacije (Full Route Cache / ISR).
 * Ne briše `.next` na disku — za to pri lokalnom devu koristite `npm run clean` kad server ne radi.
 */
export async function clearSiteCacheAction(
  _prev: ClearCacheState,
  _formData: FormData,
): Promise<ClearCacheState> {
  await requireSessionUser();
  try {
    revalidatePath("/", "layout");
    revalidatePublicSite();
    revalidatePath("/admin", "layout");
    revalidateAdminSurface();
    return {
      ok: true,
      message:
        "Keš je osvježen. Javni sajt i admin koriste svježe podatke pri sljedećem učitavanju.",
    };
  } catch (e) {
    console.error("[clearSiteCacheAction]", e);
    return { ok: false, message: "Neuspjela revalidacija. Pokušajte ponovo." };
  }
}
