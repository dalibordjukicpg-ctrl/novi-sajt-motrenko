import { redirect } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { getSession } from "@/lib/auth";

/** Spriječi RSC keš koji može ignorisati novi cookie odmah nakon prijave. */
export const dynamic = "force-dynamic";

/** Zaštićeni dio admina — provjera sesije u Node (RSC), ne u Edge middlewareu. */
export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
