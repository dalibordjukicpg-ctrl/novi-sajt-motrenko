"use server";

import { randomUUID } from "crypto";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { canManageAllSiteContent } from "@/lib/auth/content-access";
import { db } from "@/lib/db";
import { homeServiceCards, homeServiceCardTranslations } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { upsertCardTranslation } from "@/lib/queries/home-service-cards";
import { revalidatePublicSite } from "@/lib/revalidate-content";

const ALLOWED_ICONS = [
  "heart", "baby", "flask-conical", "activity", "scan", "stethoscope",
  "microscope", "test-tube", "dna", "gift", "shield", "star",
  "users", "zap", "sun", "leaf",
];

function revalidateAll() {
  revalidatePublicSite();
  revalidatePath("/admin/content/home-cards");
}

/** Spremi izmjenu jedne kartice (href, icon, visible + prevodi po jezicima). */
export async function saveCardAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const cardId = String(formData.get("cardId") ?? "").trim();
  if (!cardId) return { ok: false, error: "Nedostaje ID kartice." };

  const href = String(formData.get("href") ?? "").trim() || "#";
  const iconName = String(formData.get("iconName") ?? "heart").trim();
  const validIcon = ALLOWED_ICONS.includes(iconName) ? iconName : "heart";
  const visible = formData.get("visible") === "1";

  await db
    .update(homeServiceCards)
    .set({ href: href.slice(0, 512), iconName: validIcon, visible, updatedAt: new Date() })
    .where(eq(homeServiceCards.id, cardId));

  for (const loc of locales) {
    const title = String(formData.get(`title_${loc}`) ?? "").trim();
    const description = String(formData.get(`description_${loc}`) ?? "").trim() || null;
    await upsertCardTranslation(cardId, loc as Locale, title, description);
  }

  revalidateAll();
  return { ok: true };
}

/** Dodaj novu karticu na kraj liste. */
export async function addCardAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const [maxRow] = await db
    .select({ maxSort: sql<number>`MAX(sort_order)` })
    .from(homeServiceCards);
  const nextSort = ((maxRow?.maxSort ?? 0) as number) + 1;

  const cardId = randomUUID();
  const now = new Date();

  await db.insert(homeServiceCards).values({
    id: cardId,
    sortOrder: nextSort,
    iconName: "heart",
    href: "#",
    visible: true,
    updatedAt: now,
  });

  const titleMe = String(formData.get("title_me") ?? "Nova kartica").trim() || "Nova kartica";
  for (const loc of locales) {
    const title = loc === "me" ? titleMe : titleMe;
    await db.insert(homeServiceCardTranslations).values({
      id: randomUUID(),
      cardId,
      locale: loc as Locale,
      title,
      description: null,
    });
  }

  revalidateAll();
  return { ok: true };
}

/** Obriši karticu. */
export async function deleteCardAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const cardId = String(formData.get("cardId") ?? "").trim();
  if (!cardId) return { ok: false, error: "Nedostaje ID." };

  await db.delete(homeServiceCards).where(eq(homeServiceCards.id, cardId));
  revalidateAll();
  return { ok: true };
}

/** Pomjeri karticu gore ili dolje (zamijeni sort_order sa susjedom). */
export async function moveCardAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) return;

  const cardId = String(formData.get("cardId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "") as "up" | "down";
  if (!cardId || (direction !== "up" && direction !== "down")) return;

  const [current] = await db
    .select({ id: homeServiceCards.id, sortOrder: homeServiceCards.sortOrder })
    .from(homeServiceCards)
    .where(eq(homeServiceCards.id, cardId))
    .limit(1);
  if (!current) return;

  const neighbor = direction === "up"
    ? await db
        .select({ id: homeServiceCards.id, sortOrder: homeServiceCards.sortOrder })
        .from(homeServiceCards)
        .where(lt(homeServiceCards.sortOrder, current.sortOrder))
        .orderBy(sql`sort_order DESC`)
        .limit(1)
    : await db
        .select({ id: homeServiceCards.id, sortOrder: homeServiceCards.sortOrder })
        .from(homeServiceCards)
        .where(gt(homeServiceCards.sortOrder, current.sortOrder))
        .orderBy(asc(homeServiceCards.sortOrder))
        .limit(1);

  const [nbr] = neighbor;
  if (!nbr) return;

  await db.update(homeServiceCards).set({ sortOrder: nbr.sortOrder }).where(eq(homeServiceCards.id, current.id));
  await db.update(homeServiceCards).set({ sortOrder: current.sortOrder }).where(eq(homeServiceCards.id, nbr.id));

  revalidateAll();
}
