/** Aktivni jezici na sajtu (kasnije možete vratiti en, ru, tr). */
export const locales = ["me"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "me";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
