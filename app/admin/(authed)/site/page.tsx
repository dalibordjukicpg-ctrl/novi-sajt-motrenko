import { redirect } from "next/navigation";

import { adminPath } from "@/lib/admin-base-path";

export const dynamic = "force-dynamic";

/** Stara ruta — preusmjerenje na novu strukturu admina. */
export default function LegacyAdminSitePage() {
  redirect(adminPath("content/header-footer"));
}
