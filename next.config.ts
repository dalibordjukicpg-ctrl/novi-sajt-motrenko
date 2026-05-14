import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Spriječi Watchpack da dira Windows root sistem fajlove (EINVAL na hiberfil.sys). */
  webpack: (config, { dev }) => {
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
