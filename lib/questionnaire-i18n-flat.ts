import type { QuestionnaireI18n } from "@/lib/questionnaire-i18n";

export type FlatI18nItem = { path: string; value: string };

export function flattenQuestionnaireI18n(obj: QuestionnaireI18n): FlatI18nItem[] {
  const out: FlatI18nItem[] = [];

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

export function buildQuestionnaireOverrideFromFlat(
  items: FlatI18nItem[],
): Record<string, unknown> {
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

/** Samo razlike u odnosu na default — manji JSON u bazi. */
export function diffQuestionnaireOverride(
  defaults: FlatI18nItem[],
  edited: FlatI18nItem[],
): FlatI18nItem[] {
  const defMap = new Map(defaults.map((x) => [x.path, x.value]));
  return edited.filter((x) => defMap.get(x.path) !== x.value);
}
