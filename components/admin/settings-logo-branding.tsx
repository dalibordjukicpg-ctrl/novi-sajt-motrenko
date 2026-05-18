"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";

import { AdminMediaPicker } from "@/components/admin/admin-media-picker";
import type { MediaOption } from "@/lib/queries/media-admin";

type Props = {
  media: MediaOption[];
  initialLogoMediaId: string | null;
  initialFaviconMediaId: string | null;
};

export function SettingsLogoBrandingFields({
  media,
  initialLogoMediaId,
  initialFaviconMediaId,
}: Props) {
  const [localMedia, setLocalMedia] = useState(media);
  const [logoId, setLogoId] = useState(initialLogoMediaId ?? "");
  const [faviconId, setFaviconId] = useState(initialFaviconMediaId ?? "");
  const [picker, setPicker] = useState<"logo" | "favicon" | null>(null);

  useEffect(() => {
    setLocalMedia(media);
  }, [media]);

  const urlById = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of localMedia) out[m.id] = m.url;
    return out;
  }, [localMedia]);

  const mergeMedia = (item: MediaOption) => {
    setLocalMedia((prev) =>
      prev.some((x) => x.id === item.id) ? prev : [item, ...prev],
    );
  };

  const logoUrl = logoId ? urlById[logoId] : null;
  const faviconUrl = faviconId ? urlById[faviconId] : null;

  return (
    <>
      <input type="hidden" name="logoMediaId" value={logoId} />
      <input type="hidden" name="faviconMediaId" value={faviconId} />

      <AdminMediaPicker
        open={picker === "logo"}
        onClose={() => setPicker(null)}
        onPick={(item) => {
          mergeMedia(item);
          setLogoId(item.id);
        }}
        mediaOptions={media}
        imagesOnly={true}
        title="Izaberi ili otpremi logo"
      />
      <AdminMediaPicker
        open={picker === "favicon"}
        onClose={() => setPicker(null)}
        onPick={(item) => {
          mergeMedia(item);
          setFaviconId(item.id);
        }}
        mediaOptions={media}
        imagesOnly={true}
        title="Izaberi ili otpremi favicon"
      />

      <div className="rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50/80 to-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Logo i favicon
        </h2>
        <p className="mt-2 text-sm text-neutral-700">
          Otpremite PNG sa transparentnom pozadinom za najčišći prikaz na herou.
          Nakon čuvanja, javni header i podnožje koriste izabrani logo (ako je
          postavljen).
        </p>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-900">
              Logo sajta
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPicker("logo")}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                <ImageIcon className="h-4 w-4 shrink-0 opacity-90" />
                Izaberi ili otpremi
              </button>
              {logoId ? (
                <button
                  type="button"
                  onClick={() => setLogoId("")}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Ukloni logo (CMS)
                </button>
              ) : null}
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Pregled
              </p>
              <div className="mt-3 flex min-h-[100px] items-center justify-center rounded-md bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)_50%/16px_16px] p-4">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Pregled logotipa"
                    className="max-h-[88px] w-auto max-w-full object-contain"
                  />
                ) : (
                  <p className="text-center text-sm text-neutral-500">
                    Nije izabran CMS logo — na sajtu se koristi podrazumijevani
                    fajl iz{" "}
                    <code className="rounded bg-neutral-100 px-1 text-xs">
                      public/logo-hrc-budva.png
                    </code>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-900">
              Favicon
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPicker("favicon")}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                <ImageIcon className="h-4 w-4 shrink-0 opacity-90" />
                Izaberi ili otpremi
              </button>
              {faviconId ? (
                <button
                  type="button"
                  onClick={() => setFaviconId("")}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Podrazumijevani favicon
                </button>
              ) : null}
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Pregled
              </p>
              <div className="mt-3 flex min-h-[72px] items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                  {faviconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={faviconUrl}
                      alt="Pregled favicona"
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </div>
                <p className="text-sm text-neutral-600">
                  Ikona u kartici pregledača; preporuka kvadratna slika najmanje
                  48×48 px.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
