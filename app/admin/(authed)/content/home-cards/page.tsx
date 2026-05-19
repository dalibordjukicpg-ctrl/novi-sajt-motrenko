import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-panel";
import { HomeServiceCardsEditor } from "@/components/admin/home-service-cards-editor";
import { listHomeServiceCardsAdmin } from "@/lib/queries/home-service-cards";

export const dynamic = "force-dynamic";

export default async function HomeCardsAdminPage() {
  const cards = await listHomeServiceCardsAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        title="Kartice usluga"
        description={
          "Šest kartica u sekciji Usluge na početnoj stranici. Mijenjate naslov, opis, link i ikonicu za svaku karticu po jeziku."
        }
      />
      <AdminPanel>
        <HomeServiceCardsEditor initialCards={cards} />
      </AdminPanel>
    </div>
  );
}
