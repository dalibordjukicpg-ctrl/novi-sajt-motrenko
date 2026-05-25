import type { MetadataRoute } from "next";

import { ADMIN_BASE_PATH } from "@/lib/admin-base-path";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const adminPrefix = ADMIN_BASE_PATH.replace(/^\//, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/admin/",
        `/${adminPrefix}/`,
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
