import type { NextConfig } from "next";

import { buildLegacyWordPressRedirects } from "@/lib/legacy-wordpress-redirects";
import { buildSecurityHeaders } from "@/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    /**
     * Hostinger Node: sharp/optimizer često ruši proces (500/503).
     * Slike su već u public/ — serviraju se direktno bez server-side obrade.
     */
    unoptimized: true,
    qualities: [75, 88, 90],
  },
  /**
   * Dev server: dozvoli assete/HMR kroz tunel (npm run share:dev).
   */
  allowedDevOrigins: [
    "*.loca.lt",
    "*.localtunnel.me",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
  /**
   * Globalni security headeri (HSTS u produkciji, CSP, frame deny, itd.).
   */
  async headers() {
    const security = buildSecurityHeaders();
    return [
      {
        source: "/:path*",
        headers: security,
      },
    ];
  },
  /** 301 sa starih WordPress URL-ova na Next.js rute. */
  async redirects() {
    return buildLegacyWordPressRedirects();
  },
  /**
   * Paketi iz node_modules — bez nestabilnih vendor-chunks u devu (Windows).
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
    },
    middlewareClientMaxBodySize: "26mb",
  },
  serverExternalPackages: [
    "mysql2",
    "drizzle-orm",
    "bcryptjs",
    "tailwind-merge",
    "clsx",
    "pdfkit",
    "dejavu-fonts-ttf",
  ],
  /** Spriječi Watchpack da dira Windows root sistem fajlove (EINVAL na hiberfil.sys). */
  webpack: (config, { dev }) => {
    /**
     * NE stavljati `config.cache = false` za server u dev: na Windowsu to često daje
     * „Cannot find module './NNN.js'“ (nedostaje chunk u .next) nakon par reload-a.
     * Dovoljan je `serverExternalPackages` iznad za mysql2/drizzle.
     */
    if (dev) {
      const wo = config.watchOptions ?? {};
      const prev = wo.ignored;
      const list = Array.isArray(prev) ? prev : prev != null ? [prev] : [];
      const fromPrev = list.filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      );
      /** Webpack niz `ignored` prihvata samo string globs, ne RegExp. */
      const winSysGlobs = [
        "**/hiberfil.sys",
        "**/pagefile.sys",
        "**/swapfile.sys",
        "**/DumpStack.log.tmp",
      ];
      config.watchOptions = {
        ...wo,
        ignored: [...fromPrev, ...winSysGlobs],
      };
    }
    return config;
  },
};

export default nextConfig;
