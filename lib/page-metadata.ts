import type { Metadata } from "next";

import { absoluteSiteUrl } from "@/lib/site-url";
import { locales } from "@/lib/i18n";
import {
  getShareCopy,
  localeFromPublicPath,
  openGraphLocaleTag,
  type ShareCopy,
} from "@/lib/social-share-metadata";
import type { Locale } from "@/lib/i18n";

function resolveTitle(meta: Metadata, share: ShareCopy | null): string | undefined {
  if (typeof meta.title === "string") return meta.title;
  if (meta.title && typeof meta.title === "object" && "absolute" in meta.title) {
    const abs = meta.title.absolute;
    if (typeof abs === "string") return abs;
  }
  return share?.ogTitle;
}

function resolveDescription(
  meta: Metadata,
  share: ShareCopy | null,
): string | undefined {
  if (typeof meta.description === "string") return meta.description;
  return share?.ogDescription;
}

/** hreflang za /me, /en, /ru varijante iste putanje. */
function buildLanguageAlternates(path: string): Record<string, string> | undefined {
  const match = path.match(/^\/(me|en|ru)(\/.*)?$/);
  if (!match) return undefined;
  const suffix = match[2] ?? "";
  const languages: Record<string, string> = {
    "sr-ME": absoluteSiteUrl(`/me${suffix}`),
    en: absoluteSiteUrl(`/en${suffix}`),
    ru: absoluteSiteUrl(`/ru${suffix}`),
    "x-default": absoluteSiteUrl(`/me${suffix}`),
  };
  for (const loc of locales) {
    languages[loc] = absoluteSiteUrl(`/${loc}${suffix}`);
  }
  return languages;
}

/** Dodaje canonical, Open Graph i Twitter kartice za javne stranice. */
export function withCanonical(path: string, meta: Metadata = {}): Metadata {
  const url = absoluteSiteUrl(path);
  const locale = localeFromPublicPath(path);
  const share = locale ? getShareCopy(locale) : null;
  const title = resolveTitle(meta, share);
  const description = resolveDescription(meta, share);
  const ogImagePath = locale ? `/${locale}/opengraph-image` : "/opengraph-image";
  const ogImageUrl = absoluteSiteUrl(`${ogImagePath}?v=16`);

  const ogLocale =
    locale != null ? openGraphLocaleTag(locale as Locale) : "sr_ME";

  const languageAlternates = buildLanguageAlternates(path);

  return {
    ...meta,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: {
      ...meta.alternates,
      canonical: url,
      ...(languageAlternates ? { languages: languageAlternates } : {}),
    },
    openGraph: {
      type: "website",
      url,
      siteName: share?.siteName ?? "Human Reproduction Center",
      locale: ogLocale,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title ?? share?.ogTitle ?? "Human Reproduction Center",
        },
      ],
      ...meta.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      images: [ogImageUrl],
      ...meta.twitter,
    },
  };
}
