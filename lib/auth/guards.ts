import { redirect, unauthorized } from "next/navigation";

import { getSession } from "./session";
import type { Permission } from "./permissions";
import { hasPermission } from "./permissions";
import type { SessionUser } from "./types";

export async function requireSessionUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) {
    redirect("/admin/login");
  }
  return s;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const s = await requireSessionUser();
  if (!hasPermission(s.role, permission)) {
    unauthorized();
  }
  return s;
}
