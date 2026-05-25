import { needsRuntimeTranslation } from "@/lib/runtime-translate";
import type { TargetLocale } from "@/lib/translation-records";

export function localesNeedingPageTranslation(
  me: { title: string; body: string },
  existing: Partial<Record<TargetLocale, { title: string; body: string }>>,
): TargetLocale[] {
  const out: TargetLocale[] = [];
  for (const loc of ["en", "ru"] as const) {
    const tr = existing[loc];
    const titleMissing = needsRuntimeTranslation(tr?.title, me.title);
    const bodyMissing = needsRuntimeTranslation(tr?.body, me.body);
    if (titleMissing || bodyMissing) out.push(loc);
  }
  return out;
}

export function localesNeedingPostTranslation(
  me: { title: string; body: string; excerpt: string },
  existing: Partial<
    Record<TargetLocale, { title: string; body: string; excerpt: string }>
  >,
): TargetLocale[] {
  const out: TargetLocale[] = [];
  for (const loc of ["en", "ru"] as const) {
    const tr = existing[loc];
    const titleMissing = needsRuntimeTranslation(tr?.title, me.title);
    const bodyMissing = needsRuntimeTranslation(tr?.body, me.body);
    const excerptMissing = needsRuntimeTranslation(tr?.excerpt, me.excerpt);
    if (titleMissing || bodyMissing || excerptMissing) out.push(loc);
  }
  return out;
}

export function localesNeedingNavTranslation(
  meLabel: string,
  existing: Partial<Record<TargetLocale, { label: string }>>,
): TargetLocale[] {
  const out: TargetLocale[] = [];
  for (const loc of ["en", "ru"] as const) {
    if (needsRuntimeTranslation(existing[loc]?.label, meLabel)) {
      out.push(loc);
    }
  }
  return out;
}

export function entityNeedsAnyTranslation(
  neededLocales: readonly TargetLocale[],
): boolean {
  return neededLocales.length > 0;
}
