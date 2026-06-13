"use server";

import { redirect } from "next/navigation";

import { adminPath } from "@/lib/admin-base-path";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import {
  isMachineTranslateConfigured,
  machineTranslateTexts,
} from "@/lib/machine-translate";
import {
  getQuestionnaireI18n,
  type QuestionnaireI18n,
} from "@/lib/questionnaire-i18n";
import {
  deleteQuestionnaireOverride,
  invalidateQuestionnaireOverrideCache,
  saveQuestionnaireOverride,
} from "@/lib/questionnaire-overrides";
import { revalidatePath } from "next/cache";

/**
 * Sakuplja sve stringove iz QuestionnaireI18n strukture u flat listu.
 * Vraća parove [path, vrijednost] gdje je path "f.fullName", "sections.s1" itd.
 */
function flattenI18n(obj: QuestionnaireI18n): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];

  const walk = (node: unknown, prefix: string): void => {
    if (typeof node === "string") {
      out.push({ path: prefix, value: node });
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        walk(node[i], `${prefix}[${i}]`);
      }
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    }
  };

  walk(obj, "");
  return out;
}

/** Konstruiše JSON override od flat liste prevoda. */
function buildOverrideFromFlat(items: Array<{ path: string; value: string }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { path, value } of items) {
    const parts = path.split(/\.|\[/).filter(Boolean).map((p) => p.replace(/\]$/, ""));
    let node: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!;
      const next = parts[i + 1]!;
      const isNextArr = /^\d+$/.test(next);
      if (!(key in node)) node[key] = isNextArr ? [] : {};
      node = node[key] as Record<string, unknown>;
    }
    const last = parts[parts.length - 1]!;
    if (/^\d+$/.test(last)) {
      (node as unknown as unknown[])[Number(last)] = value;
    } else {
      node[last] = value;
    }
  }
  return out;
}

export type AutoTranslateResult = {
  ok: boolean;
  count?: number;
  error?: string;
};

/** Pokreće AI prevod ME → EN ili ME → RU i upisuje override u bazu. */
export async function autoTranslateQuestionnaireAction(
  target: "en" | "ru",
): Promise<AutoTranslateResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Niste prijavljeni." };
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return { ok: false, error: "Nemate dozvolu." };
  }
  if (!isMachineTranslateConfigured()) {
    return { ok: false, error: "AI prevod nije podešen u .env (TRANSLATE_PROVIDER + API ključ)." };
  }

  const source = getQuestionnaireI18n("me");
  const flat = flattenI18n(source);

  try {
    const translated = await machineTranslateTexts(
      flat.map((x) => x.value),
      target,
    );

    const items = flat.map((x, i) => ({
      path: x.path,
      value: translated[i] || x.value,
    }));

    const override = buildOverrideFromFlat(items);
    await saveQuestionnaireOverride(target as Locale, override as Parameters<typeof saveQuestionnaireOverride>[1]);
    invalidateQuestionnaireOverrideCache();
    revalidatePath(`/${target}/upitnik`);

    return { ok: true, count: items.length };
  } catch (e) {
    console.error("[upitnik AI translate] failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Nepoznata greška.",
    };
  }
}

/** Briše override (vraća na fajl defaulte). */
export async function resetQuestionnaireOverrideAction(target: Locale): Promise<void> {
  const session = await getSession();
  if (!session) redirect(adminPath("login"));
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    redirect(adminPath());
  }
  await deleteQuestionnaireOverride(target);
  revalidatePath(`/${target}/upitnik`);
  redirect(adminPath(`upitnik?reset=${target}`));
}
