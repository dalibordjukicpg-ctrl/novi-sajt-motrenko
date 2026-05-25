import { createHash } from "crypto";
import { unstable_cache } from "next/cache";

import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";
import {
  getTranslateProvider,
  isMachineTranslateConfigured,
  isNonTranslatableStringValue,
  machineTranslateHtml,
  machineTranslatePlain,
  machineTranslateTexts,
  type MachineTranslateTarget,
} from "@/lib/machine-translate";

/** Javni sajt: prevod na EN/RU pri prikazu ako u bazi nema pravog prevoda. */
export function isRuntimeTranslateEnabled(): boolean {
  if (process.env.AUTO_TRANSLATE_ON_VIEW === "0") return false;
  return isMachineTranslateConfigured();
}

/** Header/footer navigacija — isto kao ostatak sajta kad je AUTO_TRANSLATE_ON_VIEW=0. */
export function isNavRuntimeTranslateEnabled(): boolean {
  return isRuntimeTranslateEnabled();
}

export function isMachineTranslateTarget(
  locale: Locale,
): locale is MachineTranslateTarget {
  return locale !== defaultLocale;
}

function digest(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 24);
}

/**
 * Verzija keša mašinskih prevoda. Bump (rt-v2, rt-v3, …) invalidira sve
 * ranije keširane prevode — koristi kada se prompt mašinskog prevoda
 * promijeni, da bi se loše stare vrijednosti odbacile.
 */
const RUNTIME_TRANSLATE_CACHE_VERSION = "rt-v3";

function cacheTags(
  kind: string,
  locale: MachineTranslateTarget,
  contentKey: string,
): string[] {
  return [
    RUNTIME_TRANSLATE_CACHE_VERSION,
    kind,
    locale,
    getTranslateProvider() ?? "none",
    contentKey,
  ];
}

/**
 * Treba li runtime prevod: nema lokalnog reda, ili je tekst identičan ME (nije pravi prevod).
 */
export function needsRuntimeTranslation(
  localized: string | undefined | null,
  meSource: string | undefined | null,
): boolean {
  const loc = (localized ?? "").trim();
  const me = (meSource ?? "").trim();
  if (!me || isNonTranslatableStringValue(me)) return false;
  if (!loc) return true;
  return loc === me;
}

/** Keširani prevod jednog teksta; pri grešci API-ja vraća original. */
export async function translatePlainForLocale(
  text: string,
  locale: MachineTranslateTarget,
): Promise<string> {
  const source = text.trim();
  if (!source || !isRuntimeTranslateEnabled()) return text;
  if (isNonTranslatableStringValue(source)) return text;

  const key = digest(source);
  return unstable_cache(
    async () => {
      try {
        return await machineTranslatePlain(source, locale);
      } catch (e) {
        console.error("[runtime-translate plain]", locale, e);
        return source;
      }
    },
    cacheTags("plain", locale, key),
    { revalidate: 60 * 60 * 24 * 14 },
  )();
}

/**
 * Prevod kratke oznake za navigaciju — samo kad je runtime prevod uključen
 * (AUTO_TRANSLATE_ON_VIEW ≠ 0). U produkciji se koriste prevodi iz baze.
 */
export async function translateNavPlainForLocale(
  text: string,
  locale: MachineTranslateTarget,
): Promise<string> {
  const source = text.trim();
  if (!source || !isNavRuntimeTranslateEnabled()) return text;
  if (isNonTranslatableStringValue(source)) return text;

  const key = digest(source);
  return unstable_cache(
    async () => {
      try {
        return await machineTranslatePlain(source, locale);
      } catch (e) {
        console.error("[runtime-translate nav]", locale, e);
        return source;
      }
    },
    cacheTags("nav", locale, key),
    { revalidate: 60 * 60 * 24 * 14 },
  )();
}

/** Batch prevod više nav labela; rezultat istog redoslijeda. */
export async function translateNavTextsForLocale(
  texts: string[],
  locale: MachineTranslateTarget,
): Promise<string[]> {
  if (!isNavRuntimeTranslateEnabled()) return [...texts];
  return Promise.all(
    texts.map((t) => translateNavPlainForLocale(t, locale)),
  );
}

export async function translateHtmlForLocale(
  html: string,
  locale: MachineTranslateTarget,
): Promise<string> {
  const source = html.trim();
  if (!source || !isRuntimeTranslateEnabled()) return html;

  const key = digest(source);
  return unstable_cache(
    async () => {
      try {
        return await machineTranslateHtml(source, locale);
      } catch (e) {
        console.error("[runtime-translate html]", locale, e);
        return source;
      }
    },
    cacheTags("html", locale, key),
    { revalidate: 60 * 60 * 24 * 14 },
  )();
}

const HREF_LIKE_SUFFIXES = ["_href", ".href"] as const;

function isHrefLikeKey(key: string): boolean {
  if (key.startsWith("social.")) return true;
  return HREF_LIKE_SUFFIXES.some((s) => key.endsWith(s));
}

/** Batch prevod niza parova (lokalni tekst + ME izvor). */
export async function translateTextPairsForLocale(
  pairs: { localized: string; me: string }[],
  locale: MachineTranslateTarget,
): Promise<string[]> {
  if (!isRuntimeTranslateEnabled()) {
    return pairs.map((p) => p.localized || p.me);
  }

  const out = pairs.map((p) => (p.localized.trim() || p.me).trim());
  const indices: number[] = [];
  const texts: string[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const me = pairs[i]!.me.trim();
    if (!needsRuntimeTranslation(pairs[i]!.localized, me)) continue;
    indices.push(i);
    texts.push(me);
  }

  if (texts.length === 0) return out;

  const cacheKey = digest(texts.join("\x1e"));
  const translated = await unstable_cache(
    async () => {
      try {
        return await machineTranslateTexts(texts, locale);
      } catch (e) {
        console.error("[runtime-translate batch]", locale, e);
        return texts;
      }
    },
    cacheTags("batch", locale, cacheKey),
    { revalidate: 60 * 60 * 24 * 14 },
  )();

  for (let j = 0; j < indices.length; j++) {
    out[indices[j]!] = translated[j] ?? out[indices[j]!] ?? "";
  }
  return out;
}

/**
 * Site stringovi: prevodi ključeve gdje EN/RU nema pravog prevoda (prazno ili isti tekst kao ME).
 */
export async function applyRuntimeTranslationToStringMap<
  K extends string,
>(
  locale: Locale,
  primary: Partial<Record<K, string>>,
  merged: Partial<Record<K, string>>,
  meMap: Partial<Record<K, string>>,
  keys: readonly K[],
): Promise<Partial<Record<K, string>>> {
  if (!isMachineTranslateTarget(locale) || !isRuntimeTranslateEnabled()) {
    return merged;
  }

  const pairs: { localized: string; me: string }[] = [];
  const pairKeys: K[] = [];

  for (const k of keys) {
    const meVal = meMap[k]?.trim() ?? "";
    if (!meVal || isHrefLikeKey(k) || isNonTranslatableStringValue(meVal)) {
      continue;
    }
    if (!needsRuntimeTranslation(primary[k], meVal)) continue;
    pairKeys.push(k);
    pairs.push({ localized: primary[k] ?? "", me: meVal });
  }

  if (pairs.length === 0) return merged;

  const translated = await translateTextPairsForLocale(pairs, locale);
  const out = { ...merged };
  for (let i = 0; i < pairKeys.length; i++) {
    out[pairKeys[i]!] = translated[i] ?? meValFromKey(meMap, pairKeys[i]!);
  }
  return out;
}

function meValFromKey<K extends string>(
  meMap: Partial<Record<K, string>>,
  k: K,
): string {
  return meMap[k]?.trim() ?? "";
}
