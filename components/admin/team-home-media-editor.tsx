"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ImageIcon, Upload } from "lucide-react";

import { saveSiteGlobalsAction } from "@/app/admin/(authed)/content/site-content-actions";
import {
  AdminMediaPicker,
  uploadAdminMediaFile,
} from "@/components/admin/admin-media-picker";
import { AdminPanel } from "@/components/admin/admin-panel";
import type { MediaOption } from "@/lib/queries/media-admin";

const SLOTS = [
  { key: "teamM1MediaId", label: "Član 1 (lijevo gore)" },
  { key: "teamM2MediaId", label: "Član 2 (desno gore)" },
  { key: "teamM3MediaId", label: "Član 3 (lijevo dolje)" },
  { key: "teamM4MediaId", label: "Član 4 (desno dolje)" },
] as const;

type Props = {
  mediaOptions: MediaOption[];
  initialIds: [string | null, string | null, string | null, string | null];
};

export function TeamHomeMediaEditor({ mediaOptions, initialIds }: Props) {
  const router = useRouter();
  const [extraMedia, setExtraMedia] = useState<MediaOption[]>([]);
  const [ids, setIds] = useState<[string, string, string, string]>(() =>
    initialIds.map((id) => id ?? "") as [string, string, string, string],
  );
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setIds(initialIds.map((id) => id ?? "") as [string, string, string, string]);
  }, [initialIds[0], initialIds[1], initialIds[2], initialIds[3]]);

  function previewUrl(index: number): string | null {
    const id = ids[index];
    if (!id) return null;
    const fromExtra = extraMedia.find((m) => m.id === id);
    if (fromExtra) return fromExtra.url;
    return mediaOptions.find((m) => m.id === id)?.url ?? null;
  }

  function save() {
    const fd = new FormData();
    fd.set("teamM1MediaId", ids[0]);
    fd.set("teamM2MediaId", ids[1]);
    fd.set("teamM3MediaId", ids[2]);
    fd.set("teamM4MediaId", ids[3]);
    startTransition(async () => {
      setMsg(null);
      const res = await saveSiteGlobalsAction(fd);
      setMsg(res);
      if (res.ok) router.refresh();
    });
  }

  async function uploadSlot(index: number, file: File) {
    if (!file.type.startsWith("image/")) {
      setMsg({ error: "Za portret tima koristite sliku (JPG, PNG, WebP)." });
      return;
    }
    setUploading(index);
    setMsg(null);
    try {
      const item = await uploadAdminMediaFile(file);
      setExtraMedia((prev) => [...prev.filter((p) => p.id !== item.id), item]);
      setIds((prev) => {
        const next = [...prev] as [string, string, string, string];
        next[index] = item.id;
        return next;
      });
    } catch (e) {
      setMsg({
        error: e instanceof Error ? e.message : "Otpremanje nije uspjelo.",
      });
    } finally {
      setUploading(null);
    }
  }

  return (
    <AdminPanel
      title="Portreti u bloku „Upoznajte tim“"
      description="Četiri slike na početnoj (2×2). Bez odabira koriste se podrazumijevane fotografije iz šablona. Imena i tekstovi — forma ispod."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {SLOTS.map((slot, index) => {
          const url = previewUrl(index);
          return (
            <div
              key={slot.key}
              className="rounded-xl border border-[#eadfce] bg-[#fff9f5]/50 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#c55a15]/90">
                {slot.label}
              </p>
              <div className="mt-3 flex gap-3">
                <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-[#f0e6dc] ring-1 ring-[#eadfce] sm:h-32 sm:w-28">
                  {url ? (
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover object-[center_15%]"
                      sizes="120px"
                      unoptimized={url.startsWith("http")}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-[#8a7b6e]">
                      Nema slike
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerSlot(index)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-xs font-medium text-[#3d342c] hover:bg-white"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-[#f37021]" />
                    Iz galerije
                  </button>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-xs font-medium text-[#3d342c] hover:bg-white">
                    <Upload className="h-3.5 w-3.5 text-[#f37021]" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading === index}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void uploadSlot(index, f);
                      }}
                    />
                    {uploading === index ? "Otpremanje…" : "Otpremi"}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setIds((prev) => {
                        const next = [...prev] as [string, string, string, string];
                        next[index] = "";
                        return next;
                      })
                    }
                    className="text-xs text-[#8a7b6e] underline hover:text-[#c55a15]"
                  >
                    Ukloni (podrazumijevano)
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-[#6b5f54]">
        Sve slike su u{" "}
        <Link href="/admin/media" className="font-medium text-[#c55a15] underline">
          Medijima
        </Link>
        .
      </p>

      {msg?.error ? (
        <p className="mt-3 text-sm text-red-700">{msg.error}</p>
      ) : null}
      {msg?.ok ? (
        <p className="mt-3 text-sm text-emerald-800">Portreti sačuvani.</p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="mt-5 rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
      >
        {pending ? "Čuva se…" : "Sačuvaj portrete"}
      </button>

      <AdminMediaPicker
        open={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        onPick={(item) => {
          if (pickerSlot === null) return;
          const i = pickerSlot;
          setPickerSlot(null);
          setIds((prev) => {
            const next = [...prev] as [string, string, string, string];
            next[i] = item.id;
            return next;
          });
        }}
        mediaOptions={[...mediaOptions, ...extraMedia]}
        imagesOnly
        title="Portret člana tima"
      />
    </AdminPanel>
  );
}
