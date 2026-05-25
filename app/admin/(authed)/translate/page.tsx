import { redirect } from "next/navigation";

import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { TranslateBatchPanel } from "@/components/admin/translate-batch-panel";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { getTranslateInventoryAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTranslateBatchPage() {
  const session = await getSession();
  if (!session) {
    redirect(adminPath("login"));
  }
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    redirect(adminPath());
  }

  const inventory = await getTranslateInventoryAction();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        title="Prevodi"
        description="Pre-generisanje prevoda ME/SR → EN/RU. OpenAI se koristi samo iz ovog panela — promjena jezika na sajtu je instant (čita bazu)."
      />
      <AdminPanel>
        <TranslateBatchPanel inventory={inventory} />
      </AdminPanel>
    </div>
  );
}
