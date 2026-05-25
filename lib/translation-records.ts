import { createHash, randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { translationRecords } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";
import { getTranslateProvider } from "@/lib/machine-translate";

export type TranslationEntityType =
  | "site_page"
  | "post"
  | "nav_link"
  | "site_string"
  | "team_highlight";

export type TranslationStatus =
  | "missing"
  | "pending"
  | "machine"
  | "human"
  | "stale"
  | "failed";

export type TargetLocale = Exclude<Locale, "me">;

export function computeTranslationSourceHash(
  parts: (string | null | undefined)[],
): string {
  const text = parts.map((p) => (p ?? "").trim()).join("\x1e");
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
}

export async function upsertTranslationRecord(input: {
  entityType: TranslationEntityType;
  entityId: string;
  targetLocale: TargetLocale;
  translationStatus: TranslationStatus;
  sourceLocale?: Locale;
  sourceHash?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const now = new Date();
  const provider =
    input.translationStatus === "machine" ? getTranslateProvider() : null;

  const [existing] = await db
    .select({ id: translationRecords.id })
    .from(translationRecords)
    .where(
      and(
        eq(translationRecords.entityType, input.entityType),
        eq(translationRecords.entityId, input.entityId),
        eq(translationRecords.targetLocale, input.targetLocale),
      ),
    )
    .limit(1);

  const values = {
    sourceLocale: input.sourceLocale ?? defaultLocale,
    targetLocale: input.targetLocale,
    translationStatus: input.translationStatus,
    translatedAt:
      input.translationStatus === "machine" || input.translationStatus === "human"
        ? now
        : null,
    translationProvider: provider,
    sourceHash: input.sourceHash ?? null,
    errorMessage: input.errorMessage ?? null,
    updatedAt: now,
  };

  if (existing) {
    await db
      .update(translationRecords)
      .set(values)
      .where(eq(translationRecords.id, existing.id));
    return;
  }

  await db.insert(translationRecords).values({
    id: randomUUID(),
    entityType: input.entityType,
    entityId: input.entityId,
    ...values,
  });
}

export async function markTranslationSuccess(input: {
  entityType: TranslationEntityType;
  entityId: string;
  targetLocale: TargetLocale;
  sourceHash: string;
}): Promise<void> {
  await upsertTranslationRecord({
    entityType: input.entityType,
    entityId: input.entityId,
    targetLocale: input.targetLocale,
    translationStatus: "machine",
    sourceHash: input.sourceHash,
    errorMessage: null,
  });
}

export async function markTranslationFailed(input: {
  entityType: TranslationEntityType;
  entityId: string;
  targetLocale: TargetLocale;
  sourceHash?: string;
  errorMessage: string;
}): Promise<void> {
  await upsertTranslationRecord({
    entityType: input.entityType,
    entityId: input.entityId,
    targetLocale: input.targetLocale,
    translationStatus: "failed",
    sourceHash: input.sourceHash,
    errorMessage: input.errorMessage.slice(0, 2000),
  });
}
