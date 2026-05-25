import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";

export type ShareCopy = {
  siteName: string;
  ogTitle: string;
  ogDescription: string;
  /** Kratka linija na OG slici (ispod logotipa). */
  ogImageTagline: string;
};

export const SHARE_COPY: Record<Locale, ShareCopy> = {
  me: {
    siteName: "Human Reproduction Center",
    ogTitle: "Human Reproduction Center · Budva",
    ogDescription:
      "Napredna reproduktivna medicina i IVF. Stručan tim, savremena laboratorija i individualna njega za vašu porodicu.",
    ogImageTagline: "Reproduktivna medicina i IVF",
  },
  en: {
    siteName: "Human Reproduction Center",
    ogTitle: "Human Reproduction Center · Budva",
    ogDescription:
      "Advanced reproductive medicine and IVF. Expert team, modern laboratory, and personalized care for your family.",
    ogImageTagline: "Reproductive medicine and IVF",
  },
  ru: {
    siteName: "Human Reproduction Center",
    ogTitle: "Human Reproduction Center · Budva",
    ogDescription:
      "Современная репродуктивная медицина и ЭКО. Опытная команда, современная лаборатория и индивидуальный подход.",
    ogImageTagline: "Репродуктивная медицина и ЭКО",
  },
};

export function getShareCopy(locale: string): ShareCopy {
  return isLocale(locale) ? SHARE_COPY[locale] : SHARE_COPY.me;
}

export function localeFromPublicPath(path: string): Locale | null {
  const seg = path.replace(/^\/+/, "").split("/")[0]?.toLowerCase() ?? "";
  return isLocale(seg) ? seg : null;
}

export function openGraphLocaleTag(locale: Locale): string {
  if (locale === "en") return "en_US";
  if (locale === "ru") return "ru_RU";
  return "sr_ME";
}
