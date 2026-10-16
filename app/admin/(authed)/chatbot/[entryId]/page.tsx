import { notFound, redirect, unauthorized } from "next/navigation";

import { ChatbotEntryForm } from "@/components/admin/chatbot-entry-form";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { getKnowledgeEntryForAdmin } from "@/lib/chatbot/admin-queries";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ sacuvano?: string }>;
};

/** Novi unos (/chatbot/novi) ili izmjena postojećeg. */
export default async function ChatbotEntryPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const { entryId } = await params;
  const { sacuvano } = await searchParams;
  const isNew = entryId === "novi";
  const entry = isNew ? null : await getKnowledgeEntryForAdmin(entryId);
  if (!isNew && !entry) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
        {isNew ? "Novi unos u bazu znanja" : entry!.translations.me.question || "Unos baze znanja"}
      </h1>
      {sacuvano ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Unos je sačuvan. Bot ga odmah koristi.
        </p>
      ) : null}
      <ChatbotEntryForm key={entry?.id ?? "novi"} entry={entry} />
    </div>
  );
}
