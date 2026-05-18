import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { adminPath } from "@/lib/admin-base-path";
import {
  destroySession,
  getSession,
  hasPermission,
  PERMISSIONS,
} from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  getDbConnectionUserMessage,
  isDbConnectionError,
} from "@/lib/db-errors";

/** Spriječi RSC keš koji može ignorisati novi cookie odmah nakon prijave. */
export const dynamic = "force-dynamic";

/** Zaštićeni dio admina — puna provjera sesije i uloge u Node (RSC). */
export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession();
  } catch (e) {
    console.error("[admin layout] getSession", e);
    return (
      <div className="min-h-dvh bg-[#fff9f5] px-4 py-12 text-[#2a2118]">
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-xl font-semibold">
            Admin — greška pri učitavanju
          </h1>
          <p className="mt-3 text-sm text-[#6b5f54]">
            {isDbConnectionError(e)
              ? getDbConnectionUserMessage(e)
              : "Neočekivana greška servera. Pogledaj log u terminalu gdje radi `npm run dev`."}
          </p>
          <p className="mt-4 text-xs text-[#8a7b6e]">
            Provjeri da je MySQL pokrenut i da u .env DATABASE_URL / MYSQL_* odgovara
            tvojoj bazi, zatim migracije:{" "}
            <code className="rounded bg-neutral-100 px-1">npm run db:migrate</code>
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    const store = await cookies();
    if (store.get(SESSION_COOKIE_NAME)?.value) {
      await destroySession();
    }
    redirect(adminPath("login"));
  }

  const navFlags = {
    showUsers: hasPermission(session.role, PERMISSIONS.USERS_VIEW),
    showAudit: hasPermission(session.role, PERMISSIONS.AUDIT_VIEW),
    showAnalyticsCard: hasPermission(session.role, PERMISSIONS.ANALYTICS_VIEW),
    allowCreatePost: hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE),
    allowCreatePage: hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE),
    showGlobalSiteContent: hasPermission(
      session.role,
      PERMISSIONS.SITE_CONTENT_MANAGE,
    ),
    showPagesEntry:
      hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE) ||
      hasPermission(session.role, PERMISSIONS.ASSIGNED_CONTENT_MANAGE),
    showBookings: hasPermission(session.role, PERMISSIONS.BOOKING_REQUESTS_VIEW),
    showSiteSettings: hasPermission(
      session.role,
      PERMISSIONS.SITE_CONTENT_MANAGE,
    ),
  };

  return (
    <AdminDashboardShell
      userEmail={session.email}
      userRole={session.role}
      navFlags={navFlags}
    >
      {children}
    </AdminDashboardShell>
  );
}
