/**
 * Snimanje i čitanje prevoda upitnika iz baze.
 * Defaulti iz `lib/questionnaire-i18n.ts` se koriste kao osnova,
 * a admin može preko AI prevoda ili ručno upisati overrides.
 *
 * Skladišti se kao JSON u `site_locale_strings` tabeli pod ključem
 * `questionnaire.<locale>.full` (jedan red po jeziku).
 */

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { siteLocaleStrings } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import {
  getQuestionnaireI18n as getDefaultI18n,
  type QuestionnaireI18n,
} from "@/lib/questionnaire-i18n";

const OVERRIDE_KEY = "questionnaire.full";

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

function deepMerge<T extends Record<string, unknown>>(base: T, patch: DeepPartial<T> | undefined): T {
  if (!patch) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const baseVal = (base as Record<string, unknown>)[k];
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      out[k] = deepMerge(baseVal as Record<string, unknown>, v as DeepPartial<Record<string, unknown>>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

async function loadOverride(locale: Locale): Promise<DeepPartial<QuestionnaireI18n> | null> {
  try {
    const [row] = await db
      .select({ value: siteLocaleStrings.value })
      .from(siteLocaleStrings)
      .where(
        and(
          eq(siteLocaleStrings.fieldKey, OVERRIDE_KEY),
          eq(siteLocaleStrings.locale, locale),
        ),
      )
      .limit(1);
    if (!row || !row.value) return null;
    return JSON.parse(row.value) as DeepPartial<QuestionnaireI18n>;
  } catch (e) {
    console.warn("[questionnaire-overrides] load failed:", e);
    return null;
  }
}

const cache = new Map<Locale, { at: number; value: QuestionnaireI18n }>();
const CACHE_MS = 30_000;

/** Vraća i18n sa primijenjenim DB override-om (ako postoji). */
export async function getQuestionnaireI18nMerged(locale: Locale): Promise<QuestionnaireI18n> {
  const cached = cache.get(locale);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const base = getDefaultI18n(locale);
  const override = await loadOverride(locale);
  const merged = override ? deepMerge(base as unknown as Record<string, unknown>, override as DeepPartial<Record<string, unknown>>) as unknown as QuestionnaireI18n : base;
  cache.set(locale, { at: Date.now(), value: merged });
  return merged;
}

/** Forsira osvježavanje cache-a (poziva se nakon snimanja). */
export function invalidateQuestionnaireOverrideCache(): void {
  cache.clear();
}

/** Snima cijeli override JSON za odabrani jezik. */
export async function saveQuestionnaireOverride(
  locale: Locale,
  override: DeepPartial<QuestionnaireI18n>,
): Promise<void> {
  const value = JSON.stringify(override);
  const [existing] = await db
    .select({ id: siteLocaleStrings.id })
    .from(siteLocaleStrings)
    .where(
      and(
        eq(siteLocaleStrings.fieldKey, OVERRIDE_KEY),
        eq(siteLocaleStrings.locale, locale),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(siteLocaleStrings)
      .set({ value })
      .where(eq(siteLocaleStrings.id, existing.id));
  } else {
    await db.insert(siteLocaleStrings).values({
      id: randomUUID(),
      fieldKey: OVERRIDE_KEY,
      locale,
      value,
    });
  }
  invalidateQuestionnaireOverrideCache();
}

/** Briše override (vraća se na defaulte iz fajla). */
export async function deleteQuestionnaireOverride(locale: Locale): Promise<void> {
  await db
    .delete(siteLocaleStrings)
    .where(
      and(
        eq(siteLocaleStrings.fieldKey, OVERRIDE_KEY),
        eq(siteLocaleStrings.locale, locale),
      ),
    );
  invalidateQuestionnaireOverrideCache();
}

/** Da li za jezik postoji DB override. */
export async function hasQuestionnaireOverride(locale: Locale): Promise<boolean> {
  const [row] = await db
    .select({ id: siteLocaleStrings.id })
    .from(siteLocaleStrings)
    .where(
      and(
        eq(siteLocaleStrings.fieldKey, OVERRIDE_KEY),
        eq(siteLocaleStrings.locale, locale),
      ),
    )
    .limit(1);
  return Boolean(row);
}
