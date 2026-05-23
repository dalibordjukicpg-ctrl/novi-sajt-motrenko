"use server";

import { randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminPath, isAdminBasePathPrefix } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { db } from "@/lib/db";
import { navLinkTranslations, navLinks } from "@/lib/db/schema";
import { locales } from "@/lib/i18n";
import { revalidatePublicSite } from "@/lib/revalidate-content";

function adminReturnPath(
  formData: FormData,
  fallback: string,
): string {
  const raw = String(formData.get("returnTo") ?? "").trim();
  const pathOnly = raw.split("?")[0] ?? "";
  if (pathOnly && isAdminBasePathPrefix(pathOnly)) {
    return pathOnly;
  }
  return adminPath(fallback);
}

function redirectAdminFlash(
  formData: FormData,
  flash: "saved" | "created" | "deleted",
  fallback: string,
): never {
  redirect(`${adminReturnPath(formData, fallback)}?${flash}=1`);
}

export async function saveNavLinkAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return;
  }

  const linkId = String(formData.get("linkId") ?? "");
  if (!linkId) return;

  const href = String(formData.get("href") ?? "#");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const visible = formData.get("visible") === "on";
  const placementRaw = String(formData.get("placement") ?? "header");
  const placement = placementRaw === "footer" ? "footer" : "header";
  const footerColRaw = Number(formData.get("footerColumn") ?? 0);
  const footerColumn =
    placement === "footer"
      ? Math.min(4, Math.max(1, Number.isFinite(footerColRaw) ? footerColRaw : 1))
      : 0;

  await db
    .update(navLinks)
    .set({
      href,
      sortOrder,
      visible,
      placement,
      footerColumn,
      updatedAt: new Date(),
    })
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
  revalidatePath("/admin/pages");
  redirectAdminFlash(formData, "saved", "content/header-footer");
}

export async function createNavLinkAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return;
  }

  const placementRaw = String(formData.get("placement") ?? "header");
  const placement = placementRaw === "footer" ? "footer" : "header";
  const href = String(formData.get("href") ?? "#");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const footerColRaw = Number(formData.get("footerColumn") ?? 0);
  const footerColumn =
    placement === "footer"
      ? Math.min(4, Math.max(1, Number.isFinite(footerColRaw) ? footerColRaw : 1))
      : 0;

  const parentRaw = String(formData.get("parentId") ?? "").trim();
  const parentId = parentRaw.length > 0 ? parentRaw : null;

  const id = randomUUID();
  const now = new Date();

  await db.insert(navLinks).values({
    id,
    parentId,
    sortOrder,
    href,
    visible: true,
    placement,
    footerColumn,
    updatedAt: now,
  });

  const defaultLabel = String(formData.get("defaultLabel") ?? "Link");
  for (const loc of locales) {
    await db.insert(navLinkTranslations).values({
      id: randomUUID(),
      navLinkId: id,
      locale: loc,
      label: loc === "me" ? defaultLabel.slice(0, 255) : defaultLabel.slice(0, 255),
    });
  }

  revalidatePublicSite();
  revalidatePath("/admin/content/header");
  revalidatePath("/admin/content/header-footer");
  revalidatePath("/admin/pages");
  redirectAdminFlash(formData, "created", "content/header");
}

export async function deleteNavLinkAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return;
  }

  const linkId = String(formData.get("linkId") ?? "");
  if (!linkId) return;

  async function removeTree(id: string): Promise<void> {
    const kids = await db
      .select({ id: navLinks.id })
      .from(navLinks)
      .where(eq(navLinks.parentId, id));
    for (const k of kids) await removeTree(k.id);
    await db.delete(navLinks).where(eq(navLinks.id, id));
  }
  await removeTree(linkId);

  revalidatePublicSite();
  revalidatePath("/admin/content/header");
  revalidatePath("/admin/content/header-footer");
  redirectAdminFlash(formData, "deleted", "content/header");
}

export async function moveNavLinkOrderAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return;
  }

  const linkId = String(formData.get("linkId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!linkId || (direction !== "up" && direction !== "down")) return;

  const [current] = await db
    .select()
    .from(navLinks)
    .where(eq(navLinks.id, linkId))
    .limit(1);
  if (!current) return;

  const siblingRows = await db
    .select()
    .from(navLinks)
    .where(
      and(
        eq(navLinks.placement, current.placement),
        current.parentId
          ? eq(navLinks.parentId, current.parentId)
          : isNull(navLinks.parentId),
      ),
    )
    .orderBy(navLinks.sortOrder);

  const idx = siblingRows.findIndex((r) => r.id === linkId);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblingRows.length) return;

  const a = siblingRows[idx]!;
  const b = siblingRows[swapIdx]!;
  const now = new Date();

  await db
    .update(navLinks)
    .set({ sortOrder: b.sortOrder, updatedAt: now })
    .where(eq(navLinks.id, a.id));
  await db
    .update(navLinks)
    .set({ sortOrder: a.sortOrder, updatedAt: now })
    .where(eq(navLinks.id, b.id));

  revalidatePublicSite();
  revalidatePath("/admin/content/header");
  revalidatePath("/admin/content/header-footer");
  redirectAdminFlash(formData, "saved", "content/header");
}
