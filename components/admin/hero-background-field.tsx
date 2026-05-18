"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Film, ImageIcon, Link2, Upload } from "lucide-react";

import { saveSiteGlobalsAction } from "@/app/admin/(authed)/content/site-content-actions";
import {
  AdminMediaPicker,
  uploadAdminMediaFile,
} from "@/components/admin/admin-media-picker";
import { AdminPanel } from "@/components/admin/admin-panel";
import { adminPath } from "@/lib/admin-base-path";
import {
  isHeroBackgroundVideoUrl,
  isHeroBackgroundYoutubeUrl,
} from "@/lib/hero-background-media";
import type { MediaOption } from "@/lib/queries/media-admin";
import { parseYoutubeEmbedUrl } from "@/lib/youtube-hero";

type Source = "media" | "external" | "none";

type Props = {
  mediaOptions: MediaOption[];
  initialMediaId: string | null;
  initialExternalUrl: string | null;
  onPreviewUrlChange?: (url: string | null) => void;
};

export function HeroBackgroundField({
  mediaOptions,
  initialMediaId,
  initialExternalUrl,
  onPreviewUrlChange,
}: Props) {
  const initialSource: Source = (initialExternalUrl ?? "").trim()
    ? "external"
    : initialMediaId
      ? "media"
      : "none";

  const [source, setSource] = useState<Source>(initialSource);
  const [mediaId, setMediaId] = useState(initialMediaId ?? "");
  const [externalUrl, setExternalUrl] = useState(initialExternalUrl ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const previewUrl = useMemo(() => {
    if (source === "external") {
      const ext = externalUrl.trim();
      if (!ext) return null;
      return parseYoutubeEmbedUrl(ext) ?? ext;
    }
    if (source === "media" && mediaId) {
      return mediaOptions.find((m) => m.id === mediaId)?.url ?? null;
    }
    return null;
  }, [source, externalUrl, mediaId, mediaOptions]);

  useEffect(() => {
    onPreviewUrlChange?.(previewUrl);
  }, [previewUrl, onPreviewUrlChange]);

  function save() {
    const fd = new FormData();
    if (source === "media") {
      fd.set("heroBgMediaId", mediaId);
      fd.set("heroBgExternalUrl", "");
      fd.set("clearHeroBgExternal", "1");
    } else if (source === "external") {
      fd.set("heroBgExternalUrl", externalUrl.trim());
      fd.set("heroBgMediaId", "");
    } else {
      fd.set("heroBgMediaId", "");
      fd.set("heroBgExternalUrl", "");
      fd.set("clearHeroBgExternal", "1");
    }
    startTransition(async () => {
      setMsg(null);
      const res = await saveSiteGlobalsAction(fd);
      setMsg(res);
    });
  }

  async function uploadFromComputer(file: File) {
    setUploading(true);
    try {
      const item = await uploadAdminMediaFile(file);
      setMediaId(item.id);
      setSource("media");
    } finally {
      setUploading(false);
    }
  }

  const isVideo =
    previewUrl != null &&
    (isHeroBackgroundVideoUrl(previewUrl) || isHeroBackgroundYoutubeUrl(previewUrl));

  return (
    <AdminPanel
      title="Pozadina hero banera"
      description="Slika, video iz biblioteke, otpremanje sa računara ili YouTube / direktan link. Ako ništa nije postavljeno, koristi se podrazumijevani video u repou."
    >
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["media", "Biblioteka / upload"],
            ["external", "YouTube ili URL"],
            ["none", "Bez pozadine"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSource(id)}
            className={
              source === id
                ? "rounded-lg bg-[#f37021] px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-[#eadfce] bg-white px-3 py-1.5 text-sm text-[#5c4f44] hover:bg-[#fff9f5]"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {source === "media" ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm font-medium hover:bg-[#fff9f5]"
            >
              <ImageIcon className="h-4 w-4 text-[#f37021]" aria-hidden />
              Iz galerije
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm font-medium hover:bg-[#fff9f5]">
              <Upload className="h-4 w-4 text-[#f37021]" aria-hidden />
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadFromComputer(f);
                }}
              />
              {uploading ? "Otpremanje…" : "Otpremi fajl"}
            </label>
          </div>
          <select
            value={mediaId}
            onChange={(e) => setMediaId(e.target.value)}
            className="w-full rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm"
          >
            <option value="">— izaberi iz liste —</option>
            {mediaOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.mimeType.startsWith("video/") ? " (video)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#6b5f54]">
            Sve datoteke su u{" "}
            <Link href={adminPath("media")} className="text-[#c55a15] underline">
              Mediji
            </Link>
            .
          </p>
        </div>
      ) : null}

      {source === "external" ? (
        <div className="mt-5 space-y-2">
          <label className="block text-sm">
            <span className="font-medium text-[#3d342c]">
              YouTube ili URL videa (mp4)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-[#f37021]" aria-hidden />
              <input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… ili https://…/video.mp4"
                className="w-full rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm"
              />
            </div>
          </label>
          <p className="text-xs text-[#6b5f54]">
            YouTube se prikazuje kao pozadinski embed (bez zvuka). Za MP4/WebM
            koristite direktan link na fajl.
          </p>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-[#eadfce]">
          <p className="border-b border-[#f0e6dc] bg-[#fff9f5] px-3 py-1.5 text-xs font-medium text-[#6b5f54]">
            Pregled pozadine
            {isVideo ? " · video" : " · slika"}
          </p>
          <div className="relative aspect-[21/9] bg-zinc-900">
            {isHeroBackgroundYoutubeUrl(previewUrl) ? (
              <iframe
                title="YouTube pregled"
                src={`${previewUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${previewUrl.split("/embed/")[1] ?? ""}`}
                className="pointer-events-none absolute inset-0 h-full w-full scale-[1.35] object-cover"
                allow="autoplay; encrypted-media"
              />
            ) : isHeroBackgroundVideoUrl(previewUrl) ? (
              <video
                src={previewUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>
      ) : source === "none" ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#6b5f54]">
          <Film className="h-4 w-4 text-[#f37021]" aria-hidden />
          Na sajtu će se koristiti podrazumijevani hero video ako postoji u
          repou.
        </p>
      ) : null}

      {msg?.error ? (
        <p className="mt-3 text-sm text-red-700">{msg.error}</p>
      ) : null}
      {msg?.ok ? (
        <p className="mt-3 text-sm text-emerald-800">Pozadina sačuvana.</p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="mt-5 rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
      >
        {pending ? "Čuva se…" : "Sačuvaj pozadinu"}
      </button>

      <AdminMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(item) => {
          setMediaId(item.id);
          setSource("media");
          setPickerOpen(false);
        }}
        mediaOptions={mediaOptions}
        imagesOnly={false}
        title="Hero pozadina (slika ili video)"
      />
    </AdminPanel>
  );
}

