/** Javni jezici na sajtu (rute /me, /en, /ru). Admin upisuje sadržaj primarno na "me"; EN i RU su opcioni. */
export const locales = ["me", "en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "me";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

/** Kratak tekst za language switcher u headeru. */
export const LOCALE_SWITCH_LABELS: Record<Locale, string> = {
  me: "ME/SR",
  en: "EN",
  ru: "RU",
};
