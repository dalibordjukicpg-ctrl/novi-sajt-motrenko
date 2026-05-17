import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
   * Osnovni sigurnosni headeri za prezentacioni sajt + admin.
   * (CSP po potrebi proširite okvirno po izvorima skripti koje ubacujete u CMS.)
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  /**
   * Tree-shake lucide-react imports — manje server chunkova u devu (Windows:
   * često `Cannot find module './vendor-chunks/lucide-react.js'` kad je `.next` „prljava”).
   */
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  /**
   * Spriječava webpack vendor chunkove koji u dev na Windowsu često „puknu“
   * (MODULE_NOT_FOUND za ./vendor-chunks/*.js, zatim TypeError u webpack-runtime).
   * bcryptjs: često nedostaje vendor-chunk nakon par HMR ciklusa.
   */
  serverExternalPackages: [
    "mysql2",
    "drizzle-orm",
    "geoip-lite",
    "bcryptjs",
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
