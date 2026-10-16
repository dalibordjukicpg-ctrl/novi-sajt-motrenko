"use server";

import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS, writeAuditLog } from "@/lib/auth";
import { answerQuestion, type BotReply } from "@/lib/chatbot/answer";
import { CHATBOT_STARTER_ENTRIES, isChatbotCategory } from "@/lib/chatbot/categories";
import { clearChatbotIndexCache } from "@/lib/chatbot/knowledge-index";
import { CHATBOT_SETTINGS_ROW_ID } from "@/lib/chatbot/settings";
import { db } from "@/lib/db";
import {
  chatbotHandoffs,
  chatbotKnowledge,
  chatbotKnowledgeTranslations,
  chatbotSettings,
} from "@/lib/db/schema";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { revalidatePublicSite } from "@/lib/revalidate-content";

type ActionResult = { ok: boolean; error?: string; id?: string };

async function requireContentManager() {
  const session = await getSession();
  if (!session) return { session: null, error: "Niste prijavljeni." } as const;
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return { session: null, error: "Nemate dozvolu." } as const;
  }
  return { session, error: null } as const;
}

function str(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function afterKnowledgeChange() {
  clearChatbotIndexCache();
  revalidatePath(adminPath("chatbot"));
}

/** Novi ili izmijenjeni unos baze znanja (sa prevodima ME/EN/RU). */
export async function saveKnowledgeEntryAction(formData: FormData): Promise<ActionResult> {
  const { session, error } = await requireContentManager();
  if (!session) return { ok: false, error };

  const entryId = str(formData, "entryId", 36);
  const categoryRaw = str(formData, "category", 32);
  const category = isChatbotCategory(categoryRaw) ? categoryRaw : "opste";
  const sortOrder = Number.parseInt(str(formData, "sortOrder", 6), 10) || 0;
  const published = formData.get("published") === "1";
  const linkHref = str(formData, "linkHref", 512) || null;

  const translations = locales.map((locale) => ({
    locale,
    question: str(formData, `question_${locale}`, 500),
    keywords: str(formData, `keywords_${locale}`, 1000) || null,
    answer: str(formData, `answer_${locale}`, 5000),
  }));
  const me = translations.find((t) => t.locale === "me")!;
  if (!me.question) return { ok: false, error: "Upišite pitanje (ME)." };
  if (published && !me.answer) {
    return { ok: false, error: "Objavljen unos mora imati odgovor (ME). Upišite odgovor ili isključite „Objavljeno”." };
  }

  const id = entryId || randomUUID();
  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      if (entryId) {
        const [existing] = await tx
          .select({ id: chatbotKnowledge.id })
          .from(chatbotKnowledge)
          .where(eq(chatbotKnowledge.id, entryId))
          .limit(1);
        if (!existing) throw new Error("Unos ne postoji (možda je obrisan).");
        await tx
          .update(chatbotKnowledge)
          .set({ category, sortOrder, published, linkHref, updatedAt: now })
          .where(eq(chatbotKnowledge.id, entryId));
      } else {
        await tx.insert(chatbotKnowledge).values({
          id,
          category,
          sortOrder,
          published,
          linkHref,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const t of translations) {
        // Prazan prevod se briše — bot tada koristi ME tekst.
        if (!t.question && !t.answer) {
          await tx
            .delete(chatbotKnowledgeTranslations)
            .where(
              sql`${chatbotKnowledgeTranslations.entryId} = ${id} AND ${chatbotKnowledgeTranslations.locale} = ${t.locale}`,
            );
          continue;
        }
        await tx
          .insert(chatbotKnowledgeTranslations)
          .values({
            id: randomUUID(),
            entryId: id,
            locale: t.locale,
            question: t.question || me.question,
            keywords: t.keywords,
            answer: t.answer,
          })
          .onDuplicateKeyUpdate({
            set: { question: t.question || me.question, keywords: t.keywords, answer: t.answer },
          });
      }
    });
  } catch (e) {
    console.error("[chatbot save entry]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Snimanje nije uspjelo." };
  }

  await writeAuditLog({
    actorUserId: session.userId,
    action: entryId ? "chatbot.knowledge.update" : "chatbot.knowledge.create",
    subjectType: "chatbot_knowledge",
    subjectId: id,
    metadata: { question: me.question, published },
  });
  afterKnowledgeChange();
  return { ok: true, id };
}

export async function deleteKnowledgeEntryAction(entryId: string): Promise<ActionResult> {
  const { session, error } = await requireContentManager();
  if (!session) return { ok: false, error };

  const [existing] = await db
    .select({ id: chatbotKnowledge.id })
    .from(chatbotKnowledge)
    .where(eq(chatbotKnowledge.id, entryId))
    .limit(1);
  if (!existing) return { ok: false, error: "Unos ne postoji." };

  await db.delete(chatbotKnowledge).where(eq(chatbotKnowledge.id, entryId));
  await writeAuditLog({
    actorUserId: session.userId,
    action: "chatbot.knowledge.delete",
    subjectType: "chatbot_knowledge",
    subjectId: entryId,
  });
  afterKnowledgeChange();
  return { ok: true };
}

/** Uključi/isključi unos iz liste, bez otvaranja forme. */
export async function toggleKnowledgePublishedAction(entryId: string, published: boolean): Promise<ActionResult> {
  const { session, error } = await requireContentManager();
  if (!session) return { ok: false, error };

  if (published) {
    const [me] = await db
      .select({ answer: chatbotKnowledgeTranslations.answer })
      .from(chatbotKnowledgeTranslations)
      .where(sql`${chatbotKnowledgeTranslations.entryId} = ${entryId} AND ${chatbotKnowledgeTranslations.locale} = 'me'`)
      .limit(1);
    if (!me?.answer.trim()) return { ok: false, error: "Prvo upišite odgovor (ME)." };
  }
  await db
    .update(chatbotKnowledge)
    .set({ published, updatedAt: new Date() })
    .where(eq(chatbotKnowledge.id, entryId));
  afterKnowledgeChange();
  return { ok: true };
}

/** Predlošci pitanja (cijene, uspješnost…) — neobjavljeni, klinika upisuje odgovore. */
export async function addStarterEntriesAction(): Promise<ActionResult> {
  const { session, error } = await requireContentManager();
  if (!session) return { ok: false, error };

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const [i, s] of CHATBOT_STARTER_ENTRIES.entries()) {
      const id = randomUUID();
      await tx.insert(chatbotKnowledge).values({
        id,
        category: s.category,
        sortOrder: i,
        published: false,
        linkHref: null,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(chatbotKnowledgeTranslations).values({
        id: randomUUID(),
        entryId: id,
        locale: "me",
        question: s.question,
        keywords: s.keywords,
        answer: "",
      });
    }
  });
  await writeAuditLog({
    actorUserId: session.userId,
    action: "chatbot.knowledge.starter",
    subjectType: "chatbot_knowledge",
    metadata: { count: CHATBOT_STARTER_ENTRIES.length },
  });
  afterKnowledgeChange();
  return { ok: true };
}

/** „Probaj bota” u adminu — isti odgovor kao na sajtu, bez upisa u statistiku. */
export async function testChatbotAction(locale: string, question: string): Promise<{ ok: boolean; reply?: BotReply; error?: string }> {
  const { session, error } = await requireContentManager();
  if (!session) return { ok: false, error };
  const q = question.trim().slice(0, 500);
  if (!q) return { ok: false, error: "Upišite pitanje." };
  const loc: Locale = isLocale(locale) ? locale : "me";
  clearChatbotIndexCache();
  return { ok: true, reply: await answerQuestion(loc, q) };
}

export async function saveChatbotSettingsAction(formData: FormData): Promise<ActionResult> {
  const { session, error } = await requireContentManager();
  if (!session) return { ok: false, error };

  const values = {
    enabled: formData.get("enabled") === "1",
    botName: str(formData, "botName", 80) || "ZygoBot",
    avatarMediaId: str(formData, "avatarMediaId", 36) || null,
    greetingMe: str(formData, "greeting_me", 2000) || null,
    greetingEn: str(formData, "greeting_en", 2000) || null,
    greetingRu: str(formData, "greeting_ru", 2000) || null,
    greetingDelaySec: Math.min(Math.max(Number.parseInt(str(formData, "greetingDelaySec", 3), 10) || 0, 0), 60),
    updatedAt: new Date(),
  };
  await db
    .insert(chatbotSettings)
    .values({ id: CHATBOT_SETTINGS_ROW_ID, ...values })
    .onDuplicateKeyUpdate({ set: values });

  await writeAuditLog({
    actorUserId: session.userId,
    action: "chatbot.settings.update",
    subjectType: "chatbot_settings",
    subjectId: CHATBOT_SETTINGS_ROW_ID,
    metadata: { enabled: values.enabled, botName: values.botName },
  });
  revalidatePublicSite();
  revalidatePath(adminPath("chatbot/podesavanja"));
  return { ok: true };
}

/** Poruke osoblju: označi kao riješeno / vrati u nove. */
export async function setHandoffStatusAction(id: string, status: "new" | "done"): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, PERMISSIONS.BOOKING_REQUESTS_VIEW)) {
    return { ok: false, error: "Nemate dozvolu." };
  }
  await db.update(chatbotHandoffs).set({ status }).where(eq(chatbotHandoffs.id, id));
  revalidatePath(adminPath("chatbot/poruke"));
  return { ok: true };
}

export async function deleteHandoffAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return { ok: false, error: "Brisanje može samo administrator." };
  }
  await db.delete(chatbotHandoffs).where(eq(chatbotHandoffs.id, id));
  await writeAuditLog({
    actorUserId: session.userId,
    action: "chatbot.handoff.delete",
    subjectType: "chatbot_handoff",
    subjectId: id,
  });
  revalidatePath(adminPath("chatbot/poruke"));
  return { ok: true };
}
