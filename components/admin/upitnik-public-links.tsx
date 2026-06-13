"use client";

import { useCallback, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

type LinkItem = {
  locale: string;
  flag: string;
  label: string;
  path: string;
};

type Props = {
  links: LinkItem[];
  siteUrl: string;
};

export function UpitnikPublicLinks({ links, siteUrl }: Props) {
  const [copiedLocale, setCopiedLocale] = useState<string | null>(null);

  const copyLink = useCallback(async (locale: string, fullUrl: string) => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLocale(locale);
      window.setTimeout(() => setCopiedLocale(null), 2000);
    } catch {
      /* fallback za starije browsere */
      const ta = document.createElement("textarea");
      ta.value = fullUrl;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedLocale(locale);
      window.setTimeout(() => setCopiedLocale(null), 2000);
    }
  }, []);

  return (
    <div className="space-y-2">
      {links.map((u) => {
        const fullUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}${u.path}` : u.path;
        const copied = copiedLocale === u.locale;

        return (
          <div
            key={u.locale}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3ecdf] bg-[#fdf9f3] px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="shrink-0 text-xl">{u.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2a2118]">{u.label}</p>
                <p className="truncate text-xs font-mono text-[#8a7b6e]">{fullUrl}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyLink(u.locale, fullUrl)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition",
                  copied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-[#e9dccb] bg-white text-[#5c4f44] hover:bg-[#fdf9f3]",
                ].join(" ")}
              >
                {copied ? (
                  <>
                    <Check size={13} /> Kopirano!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Kopiraj link
                  </>
                )}
              </button>
              <a
                href={u.path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8682a]/30 bg-white px-4 py-2 text-xs font-semibold text-[#e8682a] hover:bg-[#e8682a]/5 transition"
              >
                Otvori <ExternalLink size={13} />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
