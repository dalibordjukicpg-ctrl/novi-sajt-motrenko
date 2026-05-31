import type { Locale } from "@/lib/i18n";
import {
  formLocaleToTranslateSource,
  isFormPatientTranslationEnabled,
  machineTranslateTextsToMe,
} from "@/lib/machine-translate";

function normalizeForCompare(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Original + prevod ispod (za PDF/email klinici). */
export function formatPatientTextWithTranslation(
  original: string,
  translation: string | null | undefined,
  translationLabel: string,
): string {
  const o = original.trim();
  if (!o) return "—";
  const t = translation?.trim();
  if (!t || normalizeForCompare(t) === normalizeForCompare(o)) return o;
  return `${o}\n\n${translationLabel}:\n${t}`;
}

export async function enrichPatientTextsForStaff(
  texts: string[],
  formLocale: Locale | string,
  translationLabel: string,
): Promise<string[]> {
  const source = formLocaleToTranslateSource(formLocale);
  if (!source || !isFormPatientTranslationEnabled()) {
    return texts.map((t) => t.trim() || "—");
  }

  const toTranslate = texts.map((t) => t.trim());
  const indices: number[] = [];
  const payload: string[] = [];

  for (let i = 0; i < toTranslate.length; i++) {
    const t = toTranslate[i] ?? "";
    if (!t) continue;
    indices.push(i);
    payload.push(t);
  }

  if (payload.length === 0) {
    return texts.map((t) => t.trim() || "—");
  }

  try {
    const translated = await machineTranslateTextsToMe(payload, source);
    const out = [...toTranslate];
    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j]!;
      out[idx] = formatPatientTextWithTranslation(
        toTranslate[idx]!,
        translated[j],
        translationLabel,
      );
    }
    return out.map((t) => t || "—");
  } catch (e) {
    console.warn("[form patient translate]", e);
    return texts.map((t) => t.trim() || "—");
  }
}

export async function enrichPatientTextForStaff(
  text: string,
  formLocale: Locale | string,
  translationLabel: string,
): Promise<string> {
  const [out] = await enrichPatientTextsForStaff(
    [text],
    formLocale,
    translationLabel,
  );
  return out ?? "—";
}
