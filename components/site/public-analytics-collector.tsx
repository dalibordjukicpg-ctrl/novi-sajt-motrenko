"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Jedna posjeta po navigaciji (RSC-safe): sendBeacon nakon promjene putanje.
 * Ne šalje za /admin.
 */
export function PublicAnalyticsCollector() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRef = useRef<{ path: string; t: number } | null>(null);

  useEffect(() => {
    const qs = searchParams?.toString();
    const path = `${pathname || "/"}${qs ? `?${qs}` : ""}`;
    if (path.startsWith("/admin")) return;

    const now = Date.now();
    const last = lastRef.current;
    if (last && last.path === path && now - last.t < 1200) return;
    lastRef.current = { path, t: now };

    const ref =
      typeof document !== "undefined" && document.referrer
        ? document.referrer
        : null;

    const payload = JSON.stringify({
      path,
      referrer: ref && ref.length > 0 ? ref : null,
    });

    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        // text/plain izbjegava probleme gdje browser ne pošalje JSON Content-Type
        const blob = new Blob([payload], {
          type: "text/plain;charset=UTF-8",
        });
        navigator.sendBeacon("/api/analytics/collect", blob);
      } else {
        void fetch("/api/analytics/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
          credentials: "same-origin",
        });
      }
    } catch {
      /* ignore */
    }
  }, [pathname, searchParams]);

  return null;
}
