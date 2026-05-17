export type { SessionUser } from "./types";
export type { Permission } from "./permissions";
export { PERMISSIONS, hasPermission, getPermissionsForRole, canAccessAdminPanel, isProtectedSuperAdminTarget } from "./permissions";

export {
  createSession,
  destroySession,
  getSession,
  SESSION_COOKIE_NAME,
  isLikelyValidSessionCookieShape,
} from "./session";

export { getSessionMaxAgeSeconds, DEFAULT_SUPER_ADMIN_EMAIL } from "./constants";

export { hashPassword, verifyPassword } from "./password";
export { writeAuditLog } from "./audit-log";
export {
  assertContentMutationAllowed,
  canManageAllSiteContent,
  isResourceAssignedToUser,
} from "./content-access";

export { requireSessionUser, requirePermission } from "./guards";
