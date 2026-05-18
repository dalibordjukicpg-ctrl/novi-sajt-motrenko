"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/lib/i18n";
import { isLocale, LOCALE_SWITCH_LABELS, locales } from "@/lib/i18n";

type Props = {
  locale: Locale;
  /** Header na početnoj iznad hero-a — svjetliji tekst i obrub. */
  onLight: boolean;
};

export function SiteLanguageSwitcher({ locale, onLight }: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [busy, setBusy] = useState<Locale | null>(null);

  const shell = onLight
    ? "border-zinc-200/90 bg-white/85 text-site-header-nav-light shadow-sm"
    : "border-white/35 bg-black/20 text-white shadow-[0_2px_18px_rgba(0,0,0,0.25)] backdrop-blur-[2px]";

  const inactive = onLight
    ? "text-zinc-600 hover:bg-zinc-100 hover:text-site-brand-hover"
    : "text-white/90 hover:bg-white/15 hover:text-white";

  const active = onLight
    ? "bg-site-brand text-white shadow-sm"
    : "bg-white text-site-brand shadow-sm";

  const go = (target: Locale) => {
    if (target === locale) return;

    // Za sve rute osim /[locale]/posts/[slug] — navigiraj odmah.
    const segments = pathname.split("/").filter(Boolean);
    const isPost =
      segments.length === 3 &&
      isLocale(segments[0] ?? "") &&
      segments[1] === "posts";

    if (!isPost) {
      const tail = segments.slice(1).join("/");
      router.push(tail ? `/${target}/${tail}` : `/${target}`);
      return;
    }

    // Za postove: API može naći slug na ciljnom jeziku.
    setBusy(target);
    fetch(
      `/api/locale-switch?to=${encodeURIComponent(target)}&path=${encodeURIComponent(pathname)}`,
    )
      .then((r) => r.json() as Promise<{ href?: string }>)
      .then((data) =>
        router.push(typeof data.href === "string" ? data.href : `/${target}`),
      )
      .catch(() => router.push(`/${target}`))
      .finally(() => setBusy(null));
  };

  return (
    <div
      role="navigation"
      aria-label="Jezik sajta"
      className={`flex shrink-0 items-center gap-0 rounded-md border p-0.5 ${shell}`}
    >
      {locales.map((loc) => {
        const isCurrent = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            disabled={busy !== null}
            aria-current={isCurrent ? "true" : undefined}
            onClick={() => void go(loc)}
            className={[
              "min-h-9 min-w-[2.75rem] rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition md:min-w-0 md:px-2.5 md:text-[11px]",
              isCurrent ? active : inactive,
              busy !== null && busy !== loc ? "opacity-50" : "",
            ].join(" ")}
          >
            {busy === loc ? "…" : LOCALE_SWITCH_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
