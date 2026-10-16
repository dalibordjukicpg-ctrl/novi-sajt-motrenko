import { eq } from "drizzle-orm";

import { CHATBOT_COPY } from "@/lib/chatbot/copy";
import { db } from "@/lib/db";
import { chatbotSettings } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { resolveMediaPublicUrl } from "@/lib/queries/site-globals";

export const CHATBOT_SETTINGS_ROW_ID = "default";

export type ChatbotSettingsRow = typeof chatbotSettings.$inferSelect;

export async function getChatbotSettingsRow(): Promise<ChatbotSettingsRow | null> {
  const [row] = await db
    .select()
    .from(chatbotSettings)
    .where(eq(chatbotSettings.id, CHATBOT_SETTINGS_ROW_ID))
    .limit(1);
  return row ?? null;
}

export type PublicChatbotConfig = {
  enabled: boolean;
  botName: string;
  avatarUrl: string | null;
  greeting: string;
  greetingDelaySec: number;
};

/** Za javni layout. Bez reda u bazi bot je uključen sa podrazumijevanim pozdravom. */
export async function getPublicChatbotConfig(locale: Locale): Promise<PublicChatbotConfig> {
  const copy = CHATBOT_COPY[locale];
  try {
    const row = await getChatbotSettingsRow();
    const greeting =
      { me: row?.greetingMe, en: row?.greetingEn, ru: row?.greetingRu }[locale]?.trim() ||
      copy.greeting;
    return {
      enabled: row?.enabled ?? true,
      botName: row?.botName?.trim() || "ZygoBot",
      avatarUrl: await resolveMediaPublicUrl(row?.avatarMediaId),
      greeting,
      greetingDelaySec: Math.min(Math.max(row?.greetingDelaySec ?? 3, 0), 60),
    };
  } catch (e) {
    // Tabela još ne postoji (migracija 0028) — sajt radi, bot je ugašen.
    console.error("[chatbot settings]", e);
    return { enabled: false, botName: "ZygoBot", avatarUrl: null, greeting: copy.greeting, greetingDelaySec: 3 };
  }
}
