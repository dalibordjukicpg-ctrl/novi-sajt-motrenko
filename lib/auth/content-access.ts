import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contentAssignments,
  type UserRole,
} from "@/lib/db/schema";

import { hasPermission, PERMISSIONS } from "./permissions";
import type { SessionUser } from "./types";

export async function isResourceAssignedToUser(
  userId: string,
  resourceType: "post" | "site_page",
  resourceId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: contentAssignments.id })
    .from(contentAssignments)
    .where(
      and(
        eq(contentAssignments.userId, userId),
        eq(contentAssignments.resourceType, resourceType),
        eq(contentAssignments.resourceId, resourceId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export function canManageAllSiteContent(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.SITE_CONTENT_MANAGE);
}

/**
 * Provjera za mutacije sadržaja (članak/stranica).
 * ADMIN/SUPER_ADMIN: uvijek; STAFF: samo uz assignment; ostalo: ne.
 */
export async function assertContentMutationAllowed(
  user: SessionUser,
  resourceType: "post" | "site_page",
  resourceId: string | undefined,
  mode: "create" | "update",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (canManageAllSiteContent(user.role)) {
    return { ok: true };
  }

  if (!hasPermission(user.role, PERMISSIONS.ASSIGNED_CONTENT_MANAGE)) {
    return { ok: false, error: "Nemate dozvolu za ovu radnju." };
  }

  if (mode === "create" && resourceType === "post") {
    return {
      ok: false,
      error: "Kreiranje novih članaka nije dozvoljeno za vašu ulogu.",
    };
  }

  if (mode === "create" && resourceType === "site_page") {
    return {
      ok: false,
      error: "Kreiranje stranica nije dozvoljeno za vašu ulogu.",
    };
  }

  if (!resourceId) {
    return { ok: false, error: "Nedostaje identifikator resursa." };
  }

  const assigned = await isResourceAssignedToUser(
    user.userId,
    resourceType,
    resourceId,
  );

  if (!assigned) {
    return {
      ok: false,
      error: "Niste dodijeljeni na ovaj sadržaj.",
    };
  }

  return { ok: true };
}
