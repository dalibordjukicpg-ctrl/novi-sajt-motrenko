import { Bot } from "lucide-react";
import { redirect, unauthorized } from "next/navigation";

import { ChatbotSettingsForm } from "@/components/admin/chatbot-settings-form";
import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { getChatbotSettingsRow } from "@/lib/chatbot/settings";
import { listMediaOptions } from "@/lib/queries/media-admin";

export const dynamic = "force-dynamic";

export default async function ChatbotSettingsPage() {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    unauthorized();
  }

  const [row, media] = await Promise.all([getChatbotSettingsRow(), listMediaOptions()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8682a]/10 text-[#e8682a]">
          <Bot size={22} strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">Chat bot — izgled i pozdrav</h1>
          <p className="mt-1 text-sm text-[#6b5f54]">
            Ime, slika i poruka u balončiću koji iskače posjetiocima u donjem desnom uglu sajta.
          </p>
        </div>
      </header>
      <ChatbotSettingsForm
        media={media}
        initial={{
          enabled: row?.enabled ?? true,
          botName: row?.botName ?? "ZygoBot",
          avatarMediaId: row?.avatarMediaId ?? "",
          greetingMe: row?.greetingMe ?? "",
          greetingEn: row?.greetingEn ?? "",
          greetingRu: row?.greetingRu ?? "",
          greetingDelaySec: row?.greetingDelaySec ?? 3,
        }}
      />
    </div>
  );
}
