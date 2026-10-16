import { desc, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { chatbotStatsDaily } from "@/lib/db/schema";

/** Događaji koje bot broji. Tekst pitanja se nikad ne čuva. */
export type ChatbotStatEvent = "open" | "question" | "answered" | "unknown" | "medical" | "handoff";

/** Datum po crnogorskom vremenu (YYYY-MM-DD). */
function podgoricaDay(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Podgorica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function bumpChatbotStat(
  locale: string,
  event: ChatbotStatEvent,
  entryKey = "",
): Promise<void> {
  try {
    await db
      .insert(chatbotStatsDaily)
      .values({
        day: podgoricaDay(),
        locale: locale.slice(0, 8),
        event,
        entryKey: entryKey.slice(0, 120),
        count: 1,
      })
      .onDuplicateKeyUpdate({ set: { count: sql`${chatbotStatsDaily.count} + 1` } });
  } catch (e) {
    console.error("[chatbot stats]", e);
  }
}

export type ChatbotStatsSummary = {
  days: number;
  totals: Record<ChatbotStatEvent, number>;
  topAnswers: { entryKey: string; count: number }[];
};

export async function getChatbotStatsSummary(days = 30): Promise<ChatbotStatsSummary> {
  const since = podgoricaDay(new Date(Date.now() - (days - 1) * 86_400_000));
  const totalsRows = await db
    .select({ event: chatbotStatsDaily.event, total: sql<number>`SUM(${chatbotStatsDaily.count})` })
    .from(chatbotStatsDaily)
    .where(gte(chatbotStatsDaily.day, since))
    .groupBy(chatbotStatsDaily.event);

  const totals: Record<ChatbotStatEvent, number> = {
    open: 0,
    question: 0,
    answered: 0,
    unknown: 0,
    medical: 0,
    handoff: 0,
  };
  for (const r of totalsRows) {
    if (r.event in totals) totals[r.event as ChatbotStatEvent] = Number(r.total) || 0;
  }

  const topRows = await db
    .select({ entryKey: chatbotStatsDaily.entryKey, total: sql<number>`SUM(${chatbotStatsDaily.count})` })
    .from(chatbotStatsDaily)
    .where(sql`${chatbotStatsDaily.day} >= ${since} AND ${chatbotStatsDaily.event} = 'answered'`)
    .groupBy(chatbotStatsDaily.entryKey)
    .orderBy(desc(sql`SUM(${chatbotStatsDaily.count})`))
    .limit(10);

  return {
    days,
    totals,
    topAnswers: topRows.map((r) => ({ entryKey: r.entryKey, count: Number(r.total) || 0 })),
  };
}
