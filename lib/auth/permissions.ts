import type { UserRole } from "@/lib/db/schema";

/**
 * Centralizovane permisije — komponente i akcije koriste ove konstante,
 * mapiranje uloga je isključivo ovdje.
 */
export const PERMISSIONS = {
  ADMIN_PANEL_ACCESS: "admin.panel",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  USERS_ROLES: "users.roles",
  USERS_DEACTIVATE: "users.deactivate",
  AUDIT_VIEW: "audit.view",
  INTEGRATIONS_MANAGE: "integrations.manage",
  SITE_CONTENT_MANAGE: "site.content.manage",
  ASSIGNED_CONTENT_MANAGE: "assigned.content.manage",
  MEDIA_MANAGE: "media.manage",
  ANALYTICS_VIEW: "analytics.view",
  /** Pregled upita sa javne forme za zakazivanje (može sadržavati zdravstvene podatke). */
  BOOKING_REQUESTS_VIEW: "bookings.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const ROLE_MATRIX: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: [
    PERMISSIONS.ADMIN_PANEL_ACCESS,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_ROLES,
    PERMISSIONS.USERS_DEACTIVATE,
    PERMISSIONS.SITE_CONTENT_MANAGE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.BOOKING_REQUESTS_VIEW,
  ],
  STAFF: [
    PERMISSIONS.ADMIN_PANEL_ACCESS,
    PERMISSIONS.ASSIGNED_CONTENT_MANAGE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.BOOKING_REQUESTS_VIEW,
  ],
  USER: [],
};

const roleCache = new Map<UserRole, ReadonlySet<Permission>>();

function permissionSetForRole(role: UserRole): ReadonlySet<Permission> {
  const hit = roleCache.get(role);
  if (hit) return hit;
  const set = new Set<Permission>(ROLE_MATRIX[role]);
  roleCache.set(role, set);
  return set;
}

export function getPermissionsForRole(role: UserRole): ReadonlySet<Permission> {
  return permissionSetForRole(role);
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return permissionSetForRole(role).has(permission);
}

export function canAccessAdminPanel(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.ADMIN_PANEL_ACCESS);
}

/** ADMIN ne smije koristiti SUPER_ADMIN kao meta u akcijama nad korisnikom. */
export function isProtectedSuperAdminTarget(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  return targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN";
}
