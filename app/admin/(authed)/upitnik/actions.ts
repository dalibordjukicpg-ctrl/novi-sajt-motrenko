"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import {
  buildQuestionnaireOverrideFromFlat,
  diffQuestionnaireOverride,
  flattenQuestionnaireI18n,
  type FlatI18nItem,
} from "@/lib/questionnaire-i18n-flat";
import { getQuestionnaireI18n } from "@/lib/questionnaire-i18n";
import {
  deleteQuestionnaireOverride,
  invalidateQuestionnaireOverrideCache,
  saveQuestionnaireOverride,
} from "@/lib/questionnaire-overrides";

export type SaveQuestionnaireTranslationResult = {
  ok: boolean;
  count?: number;
  error?: string;
};

export async function saveQuestionnaireTranslationAction(
  locale: "en" | "ru",
  items: FlatI18nItem[],
): Promise<SaveQuestionnaireTranslationResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Niste prijavljeni." };
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return { ok: false, error: "Nemate dozvolu." };
  }

  const defaults = flattenQuestionnaireI18n(getQuestionnaireI18n(locale));
  const changed = diffQuestionnaireOverride(defaults, items);

  try {
    if (changed.length === 0) {
      await deleteQuestionnaireOverride(locale);
    } else {
      const override = buildQuestionnaireOverrideFromFlat(changed);
      await saveQuestionnaireOverride(
        locale,
        override as Parameters<typeof saveQuestionnaireOverride>[1],
      );
    }
    invalidateQuestionnaireOverrideCache();
    revalidatePath(`/${locale}/upitnik`);
    revalidatePath(adminPath("upitnik"));
    revalidatePath(adminPath(`upitnik/prevod/${locale}`));
    return { ok: true, count: changed.length };
  } catch (e) {
    console.error("[upitnik translate save]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Snimanje nije uspjelo.",
    };
  }
}

export async function resetQuestionnaireOverrideAction(target: Locale): Promise<void> {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    redirect(adminPath());
  }

  await deleteQuestionnaireOverride(target);
  invalidateQuestionnaireOverrideCache();
  revalidatePath(`/${target}/upitnik`);
  revalidatePath(adminPath("upitnik"));
  redirect(adminPath(`upitnik?reset=${target}`));
}
