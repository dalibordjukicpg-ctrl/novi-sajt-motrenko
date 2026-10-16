import { asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  chatbotHandoffs,
  chatbotKnowledge,
  chatbotKnowledgeTranslations,
} from "@/lib/db/schema";
import { locales, type Locale } from "@/lib/i18n";

export type KnowledgeTranslationAdmin = { question: string; keywords: string; answer: string };

export type KnowledgeEntryAdmin = {
  id: string;
  category: string;
  sortOrder: number;
  published: boolean;
  linkHref: string;
  updatedAt: Date;
  translations: Record<Locale, KnowledgeTranslationAdmin>;
};

const emptyTranslations = (): Record<Locale, KnowledgeTranslationAdmin> =>
  Object.fromEntries(locales.map((l) => [l, { question: "", keywords: "", answer: "" }])) as Record<
    Locale,
    KnowledgeTranslationAdmin
  >;

export async function listKnowledgeEntriesForAdmin(): Promise<KnowledgeEntryAdmin[]> {
  const entries = await db
    .select()
    .from(chatbotKnowledge)
    .orderBy(asc(chatbotKnowledge.category), asc(chatbotKnowledge.sortOrder), asc(chatbotKnowledge.createdAt));
  const trans = await db.select().from(chatbotKnowledgeTranslations);

  const byEntry = new Map<string, Record<Locale, KnowledgeTranslationAdmin>>();
  for (const t of trans) {
    const m = byEntry.get(t.entryId) ?? emptyTranslations();
    m[t.locale] = { question: t.question, keywords: t.keywords ?? "", answer: t.answer };
    byEntry.set(t.entryId, m);
  }

  return entries.map((e) => ({
    id: e.id,
    category: e.category,
    sortOrder: e.sortOrder,
    published: e.published,
    linkHref: e.linkHref ?? "",
    updatedAt: e.updatedAt,
    translations: byEntry.get(e.id) ?? emptyTranslations(),
  }));
}

export async function getKnowledgeEntryForAdmin(id: string): Promise<KnowledgeEntryAdmin | null> {
  const [e] = await db.select().from(chatbotKnowledge).where(eq(chatbotKnowledge.id, id)).limit(1);
  if (!e) return null;
  const trans = await db
    .select()
    .from(chatbotKnowledgeTranslations)
    .where(eq(chatbotKnowledgeTranslations.entryId, id));
  const translations = emptyTranslations();
  for (const t of trans) {
    translations[t.locale] = { question: t.question, keywords: t.keywords ?? "", answer: t.answer };
  }
  return {
    id: e.id,
    category: e.category,
    sortOrder: e.sortOrder,
    published: e.published,
    linkHref: e.linkHref ?? "",
    updatedAt: e.updatedAt,
    translations,
  };
}

export type ChatbotHandoffAdmin = typeof chatbotHandoffs.$inferSelect;

export async function listChatbotHandoffsForAdmin(limit = 300): Promise<ChatbotHandoffAdmin[]> {
  return db.select().from(chatbotHandoffs).orderBy(desc(chatbotHandoffs.createdAt)).limit(limit);
}

export async function countNewChatbotHandoffs(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(chatbotHandoffs)
    .where(eq(chatbotHandoffs.status, "new"));
  return row?.n ?? 0;
}
