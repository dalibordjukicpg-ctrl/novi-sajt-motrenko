"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { saveSiteGlobalsAction } from "@/app/admin/(authed)/content/site-content-actions";
import { HeroAdminPreview } from "@/components/admin/hero-admin-preview";
import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import type { SiteStringMatrix } from "@/lib/admin/build-site-matrix";
import type { MediaOption } from "@/lib/queries/media-admin";
import type { SiteGlobalsRow } from "@/lib/queries/site-globals";

type Props = {
  matrix: SiteStringMatrix;
  globals: SiteGlobalsRow | null;
  media: MediaOption[];
};

export function HeroPageClient({ matrix, globals, media }: Props) {
  const router = useRouter();
  const [heroBgId, setHeroBgId] = useState(globals?.heroBgMediaId ?? "");
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const bgUrl = useMemo(() => {
    const hit = media.find((m) => m.id === heroBgId);
    return hit?.url ?? null;
  }, [media, heroBgId]);

  return (
    <TabbedSiteStringsForm
      group="hero"
      matrix={matrix}
      preview={({ draft, activeLocale }) => (
        <HeroAdminPreview
          locale={activeLocale}
          draft={draft}
          heroBgUrl={bgUrl}
        />
      )}
    >
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900">
          Pozadinska slika (media)
        </h3>
        <p className="mt-1 text-xs text-neutral-600">
          Odaberi postojeću sliku iz biblioteke ili je otpremi u{" "}
          <Link href="/admin/media" className="font-medium text-teal-800 underline">
            Mediji
          </Link>
          .
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              setMsg(null);
              const res = await saveSiteGlobalsAction(fd);
              setMsg(res);
              if (res.ok) router.refresh();
            });
          }}
        >
          <select
            name="heroBgMediaId"
            value={heroBgId}
            onChange={(e) => setHeroBgId(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Bez pozadinske slike</option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {msg?.error && (
            <p className="text-sm text-red-700">{msg.error}</p>
          )}
          {msg?.ok && (
            <p className="text-sm text-emerald-800">Pozadina sačuvana.</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
          >
            {pending ? "Čuva se…" : "Sačuvaj pozadinu"}
          </button>
        </form>
      </div>
    </TabbedSiteStringsForm>
  );
}
