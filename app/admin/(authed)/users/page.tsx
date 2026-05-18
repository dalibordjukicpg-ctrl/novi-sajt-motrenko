import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { listUsersForAdmin } from "@/lib/queries/admin-users";
import { unauthorized, redirect } from "next/navigation";

import { UsersAdminTable } from "./users-admin-table";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.USERS_VIEW)) {
    unauthorized();
  }

  const sp = await searchParams;
  const search =
    typeof sp.q === "string" ? sp.q : Array.isArray(sp.q) ? sp.q[0] : "";
  const roleFilterRaw =
    typeof sp.role === "string"
      ? sp.role
      : Array.isArray(sp.role)
        ? sp.role[0]
        : "all";
  const activeOnly = sp.active === "1";

  const roleFilter =
    roleFilterRaw === "SUPER_ADMIN" ||
    roleFilterRaw === "ADMIN" ||
    roleFilterRaw === "STAFF" ||
    roleFilterRaw === "USER"
      ? roleFilterRaw
      : "all";

  const rows = await listUsersForAdmin({
    actorRole: session.role,
    search,
    roleFilter,
    activeOnly,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
          Korisnici
        </h1>
        <p className="mt-1 text-sm text-[#6b5f54]">
          Pretraga, filtri i uloge. SUPER_ADMIN nalozi su vidljivi samo drugom
          SUPER_ADMIN-u.
        </p>
      </div>
      <UsersAdminTable
        initialRows={rows}
        actorRole={session.role}
        canCreate={hasPermission(session.role, PERMISSIONS.USERS_MANAGE)}
        canRoles={hasPermission(session.role, PERMISSIONS.USERS_ROLES)}
        canDeactivate={hasPermission(
          session.role,
          PERMISSIONS.USERS_DEACTIVATE,
        )}
      />
    </div>
  );
}
