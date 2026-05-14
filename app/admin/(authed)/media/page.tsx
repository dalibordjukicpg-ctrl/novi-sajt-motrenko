import { MediaAdminView } from "@/app/admin/(authed)/media/media-admin-view";
import { listMediaForAdmin } from "@/lib/queries/media-admin";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const items = await listMediaForAdmin();
  return <MediaAdminView items={items} />;
}
