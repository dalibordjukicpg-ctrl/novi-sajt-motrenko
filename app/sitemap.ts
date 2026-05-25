import type { MetadataRoute } from "next";

import { locales } from "@/lib/i18n";
import { listPublishedBlogSlugsForSitemap } from "@/lib/queries/posts";
import { listPublishedSitePageSlugs } from "@/lib/queries/site-pages";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({
      url: `${base}/${locale}`,
      changeFrequency: "weekly",
      priority: locale === "me" ? 1 : 0.8,
    });
  }

  try {
    const pageSlugs = await listPublishedSitePageSlugs();
    for (const slug of pageSlugs) {
      const encoded = encodeURIComponent(slug);
      for (const locale of locales) {
        entries.push({
          url: `${base}/${locale}/s/${encoded}`,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }

    const posts = await listPublishedBlogSlugsForSitemap();
    for (const post of posts) {
      const encoded = encodeURIComponent(post.slug);
      for (const locale of locales) {
        entries.push({
          url: `${base}/${locale}/posts/${encoded}`,
          lastModified: post.updatedAt,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch (e) {
    console.error("[sitemap]", e);
  }

  return entries;
}
