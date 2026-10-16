import { MessagesSquare } from "lucide-react";
import { redirect, unauthorized } from "next/navigation";

import { ChatbotHandoffsTable } from "@/components/admin/chatbot-handoffs-table";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { listChatbotHandoffsForAdmin } from "@/lib/chatbot/admin-queries";

export const dynamic = "force-dynamic";

export default async function ChatbotHandoffsPage() {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.BOOKING_REQUESTS_VIEW)) {
    unauthorized();
  }

  const rows = await listChatbotHandoffsForAdmin();
  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8682a]/10 text-[#e8682a]">
          <MessagesSquare size={22} strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
            Poruke osoblju iz chata {newCount > 0 ? `(${newCount} novih)` : ""}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b5f54]">
            Pacijent ih šalje kad bot ne zna odgovor ili kad pitanje traži ljekara. Mogu sadržati
            zdravstvene podatke — tretirajte ih kao povjerljive. Kad se javite pacijentu, označite poruku
            kao riješenu.
          </p>
        </div>
      </header>
      <ChatbotHandoffsTable
        rows={rows}
        canDelete={hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)}
      />
    </div>
  );
}
