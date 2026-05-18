import { redirect, unauthorized } from "next/navigation";

import { adminPath } from "@/lib/admin-base-path";

import { getSession } from "./session";
import type { Permission } from "./permissions";
import { hasPermission } from "./permissions";
import type { SessionUser } from "./types";

export async function requireSessionUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) {
    redirect(adminPath("login"));
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
