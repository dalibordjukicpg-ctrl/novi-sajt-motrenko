"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ImageIcon, Upload, X } from "lucide-react";

import type { MediaOption } from "@/lib/queries/media-admin";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (item: MediaOption) => void;
  mediaOptions: MediaOption[];
  /** Za umetanje u tekst / naslovnu — samo slike */
  imagesOnly?: boolean;
  title?: string;
};

function isImageOption(m: MediaOption): boolean {
  return m.mimeType.startsWith("image/");
}

export async function uploadAdminMediaFile(file: File): Promise<MediaOption> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    id?: string;
    url?: string;
    filename?: string;
    mimeType?: string;
  };
  if (!res.ok || !j.id || !j.url) {
    throw new Error(j.error ?? "Otpremanje nije uspjelo.");
  }
  return {
    id: j.id,
    url: j.url,
    label: j.filename ?? file.name,
    mimeType: j.mimeType ?? file.type,
  };
}

export function AdminMediaPicker({
  open,
  onClose,
  onPick,
  mediaOptions,
  imagesOnly = true,
  title = "Izaberi sliku",
}: Props) {
  const router = useRouter();
  const [extra, setExtra] = useState<MediaOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: MediaOption[] = [];
    for (const m of [...extra, ...mediaOptions]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      if (imagesOnly && !isImageOption(m)) continue;
      out.push(m);
    }
    return out;
  }, [extra, mediaOptions, imagesOnly]);

  const handleUpload = useCallback(
    (file: File) => {
      if (imagesOnly && !file.type.startsWith("image/")) {
        setError("Dozvoljene su samo slike.");
        return;
      }
      setError(null);
      startTransition(async () => {
        try {
          const item = await uploadAdminMediaFile(file);
          setExtra((prev) => [item, ...prev]);
          router.refresh();
          onPick(item);
          onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Greška pri otpremanju.");
        }
      });
    },
    [imagesOnly, onClose, onPick, router],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-media-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Zatvori"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h2
            id="admin-media-picker-title"
            className="text-base font-semibold text-neutral-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
            <Upload className="h-4 w-4 text-[#f37021]" aria-hidden />
            <input
              type="file"
              accept={
                imagesOnly
                  ? "image/*"
                  : "image/*,video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov"
              }
              className="hidden"
              disabled={pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleUpload(file);
              }}
            />
            {pending ? "Otpremanje…" : "Otpremi sa računara"}
          </label>
          <p className="mt-2 text-xs text-neutral-500">
            Novi fajl se dodaje u <span className="font-medium">Mediji</span> i odmah možeš da
            ga izabereš.
          </p>
          {error ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-neutral-500">
              <ImageIcon className="h-10 w-10 text-neutral-300" aria-hidden />
              <p>Nema slika u galeriji. Otpremi prvu iznad.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      onPick(item);
                      onClose();
                    }}
                    className={cn(
                      "group relative aspect-square w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100",
                      "transition hover:border-[#f37021] hover:ring-2 hover:ring-[#f37021]/30 focus:outline-none focus:ring-2 focus:ring-[#f37021]",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[10px] leading-tight text-white">
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
