export const locales = ["me", "en", "ru", "tr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "me";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
