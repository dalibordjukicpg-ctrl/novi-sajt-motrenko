"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { saveSocialLinksAction } from "@/app/admin/(authed)/content/site-content-actions";
import type { SiteStringMatrix } from "@/lib/admin/build-site-matrix";
import { SITE_STRING_LABELS } from "@/lib/site-fields";

const SOCIAL_KEYS = [
  "social.facebook",
  "social.instagram",
  "social.linkedin",
] as const;

type SocialKey = (typeof SOCIAL_KEYS)[number];

function pickUrl(matrix: SiteStringMatrix, key: SocialKey): string {
  const row = matrix[key];
  return (row.me || row.en || row.ru || "").trim();
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

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        const fd = new FormData();
        for (const key of SOCIAL_KEYS) {
          fd.set(key, urls[key]);
        }
        startTransition(async () => {
          const res = await saveSocialLinksAction(fd);
          setMsg(res);
          if (res.ok) router.refresh();
        });
      }}
    >
      <p className="text-sm leading-relaxed text-[#6b5f54]">
        Linkovi u footeru (sekcija „Društvene mreže”).{" "}
        <strong className="font-medium text-[#3d342c]">
          Ostavite polje prazno
        </strong>{" "}
        da sakrijete tu mrežu — npr. obrišite LinkedIn URL i sačuvajte.
      </p>

      {SOCIAL_KEYS.map((key) => (
        <label key={key} className="block text-sm">
          <span className="font-medium text-[#3d342c]">{SITE_STRING_LABELS[key]}</span>
          <input
            type="url"
            name={key}
            value={urls[key]}
            onChange={(ev) =>
              setUrls((prev) => ({ ...prev, [key]: ev.target.value }))
            }
            placeholder="https://… (prazno = ne prikazuje se)"
            className="mt-1 w-full rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-[#3d342c] outline-none focus:border-[#c9a88a] focus:ring-1 focus:ring-[#c9a88a]"
            autoComplete="off"
          />
        </label>
      ))}

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
