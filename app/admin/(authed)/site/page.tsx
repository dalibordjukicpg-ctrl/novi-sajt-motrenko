import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Stara ruta — preusmjerenje na novu strukturu admina. */
export default function LegacyAdminSitePage() {
  redirect("/admin/content/header-footer");
}
