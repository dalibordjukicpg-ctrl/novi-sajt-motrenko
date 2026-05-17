import { locales, type Locale } from "@/lib/i18n";

export function resolvePublicHref(locale: Locale, href: string): string {
  const t = href.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t === "/" || t === "") return `/${locale}`;
  if (t.startsWith("#")) return `/${locale}${t}`;
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (t.startsWith("/posts/") || t.startsWith("/s/")) {
      return `/${locale}${t}`;
    }
    const prefixed = locales.some(
      (l) => t === `/${l}` || t.startsWith(`/${l}/`),
    );
    if (prefixed) return t;
    return `/${locale}${t}`;
  }
  return t;
}
