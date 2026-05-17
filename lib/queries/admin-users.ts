import { and, desc, eq, like, ne } from "drizzle-orm";

import { isProtectedSuperAdminTarget } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";

export type AdminUserRow = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export async function listUsersForAdmin(opts: {
  actorRole: UserRole;
  search?: string;
  roleFilter?: UserRole | "all";
  activeOnly?: boolean;
}): Promise<AdminUserRow[]> {
  const conditions = [];

  if (opts.actorRole !== "SUPER_ADMIN") {
    conditions.push(ne(users.role, "SUPER_ADMIN"));
  }

  if (opts.roleFilter && opts.roleFilter !== "all") {
    conditions.push(eq(users.role, opts.roleFilter));
  }

  if (opts.activeOnly) {
    conditions.push(eq(users.isActive, true));
  }

  const q = String(opts.search ?? "").trim().replace(/[%_]/g, "");
  if (q.length > 0) {
    conditions.push(like(users.email, `%${q}%`));
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt));
}

export function canActorEditTargetUser(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  if (isProtectedSuperAdminTarget(actorRole, targetRole)) return false;
  return true;
}
