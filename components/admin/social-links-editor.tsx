"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { saveSocialLinksAction } from "@/app/admin/(authed)/content/site-content-actions";
import type { SiteStringMatrix } from "@/lib/admin/build-site-matrix";
import { SITE_STRING_LABELS } from "@/lib/site-fields";

const SOCIAL_KEYS = [
  "social.facebook",
  "social.instagram",
  "social.youtube",
  "social.linkedin",
] as const;

type SocialKey = (typeof SOCIAL_KEYS)[number];

/** URL-ovi su isti za sve jezike — koristimo ME red iz baze. */
function pickUrl(matrix: SiteStringMatrix, key: SocialKey): string {
  return (matrix[key]?.me ?? "").trim();
}

export function SocialLinksEditor({ matrix }: { matrix: SiteStringMatrix }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [urls, setUrls] = useState(() =>
    Object.fromEntries(SOCIAL_KEYS.map((k) => [k, pickUrl(matrix, k)])) as Record<
      SocialKey,
      string
    >,
  );

  useEffect(() => {
    setUrls(
      Object.fromEntries(SOCIAL_KEYS.map((k) => [k, pickUrl(matrix, k)])) as Record<
        SocialKey,
        string
      >,
    );
  }, [matrix]);

  function submit(nextUrls: Record<SocialKey, string>) {
    setMsg(null);
    const fd = new FormData();
    for (const key of SOCIAL_KEYS) {
      fd.set(key, nextUrls[key] ?? "");
    }
    startTransition(async () => {
      const res = await saveSocialLinksAction(fd);
      setMsg(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(urls);
      }}
    >
      <p className="text-sm leading-relaxed text-[#6b5f54]">
        Linkovi u footeru (sekcija „Pratite nas“ / društvene mreže).{" "}
        <strong className="font-medium text-[#3d342c]">
          Prazno polje = mreža se ne prikazuje.
        </strong>{" "}
        Za LinkedIn kliknite <strong>Ukloni</strong> ili obrišite URL pa Sačuvaj.
      </p>

      {SOCIAL_KEYS.map((key) => {
        const active = urls[key].trim().length > 0;
        return (
          <div key={key} className="block text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-[#3d342c]">
                {SITE_STRING_LABELS[key]}
              </span>
              <span
                className={
                  active
                    ? "text-xs font-medium text-emerald-700"
                    : "text-xs text-[#8a7b6e]"
                }
              >
                {active ? "Prikazuje se na sajtu" : "Skriveno"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                name={key}
                value={urls[key]}
                onChange={(ev) =>
                  setUrls((prev) => ({ ...prev, [key]: ev.target.value }))
                }
                placeholder={
                  key === "social.youtube"
                    ? "https://youtube.com/@… (prazno = ne prikazuje se)"
                    : "https://… (prazno = ne prikazuje se)"
                }
                className="min-w-[min(100%,16rem)] flex-1 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-[#3d342c] outline-none focus:border-[#c9a88a] focus:ring-1 focus:ring-[#c9a88a]"
                autoComplete="off"
                inputMode="url"
              />
              <button
                type="button"
                disabled={pending || !active}
                onClick={() => {
                  const next = { ...urls, [key]: "" };
                  setUrls(next);
                  submit(next);
                }}
                className="shrink-0 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm font-medium text-[#5c4f44] hover:bg-[#fff9f5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ukloni
              </button>
            </div>
          </div>
        );
      })}

      {msg?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {msg.error}
        </p>
      ) : null}
      {msg?.ok ? (
        <p className="text-sm text-emerald-800">Sačuvano.</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#f37021] px-5 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
      >
        {pending ? "Čuva se…" : "Sačuvaj društvene mreže"}
      </button>
    </form>
  );
}
