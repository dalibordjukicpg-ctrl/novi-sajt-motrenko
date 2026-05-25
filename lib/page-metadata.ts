import type { Metadata } from "next";

import { absoluteSiteUrl } from "@/lib/site-url";
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

/** Dodaje canonical, Open Graph i Twitter kartice za javne stranice. */
export function withCanonical(path: string, meta: Metadata = {}): Metadata {
  const url = absoluteSiteUrl(path);
  const locale = localeFromPublicPath(path);
  const share = locale ? getShareCopy(locale) : null;
  const title = resolveTitle(meta, share);
  const description = resolveDescription(meta, share);
  const ogImagePath = locale ? `/${locale}/opengraph-image` : "/opengraph-image";
  const ogImageUrl = absoluteSiteUrl(ogImagePath);

  const ogLocale =
    locale != null ? openGraphLocaleTag(locale as Locale) : "sr_ME";

  return {
    ...meta,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: {
      ...meta.alternates,
      canonical: url,
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
