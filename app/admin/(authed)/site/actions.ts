"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { navLinkTranslations, navLinks } from "@/lib/db/schema";
import { locales } from "@/lib/i18n";
import { revalidatePublicSite } from "@/lib/revalidate-content";

export async function saveNavLinkAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const linkId = String(formData.get("linkId") ?? "");
  if (!linkId) return;

  const href = String(formData.get("href") ?? "#");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const visible = formData.get("visible") === "on";

  await db
    .update(navLinks)
    .set({ href, sortOrder, visible, updatedAt: new Date() })
    .where(eq(navLinks.id, linkId));

  for (const loc of locales) {
    const label = String(formData.get(`label_${linkId}_${loc}`) ?? "");
    const [tr] = await db
      .select({ id: navLinkTranslations.id })
      .from(navLinkTranslations)
      .where(
        and(
          eq(navLinkTranslations.navLinkId, linkId),
          eq(navLinkTranslations.locale, loc),
        ),
      )
      .limit(1);
    if (tr) {
      await db
        .update(navLinkTranslations)
        .set({ label })
        .where(eq(navLinkTranslations.id, tr.id));
    } else {
      await db.insert(navLinkTranslations).values({
        id: randomUUID(),
        navLinkId: linkId,
        locale: loc,
        label,
      });
    }
  }

  revalidatePublicSite();
  revalidatePath("/admin/site");
  revalidatePath("/admin/content/header-footer");
  revalidatePath("/admin/content/hero");
  revalidatePath("/admin/content/sections");
}
