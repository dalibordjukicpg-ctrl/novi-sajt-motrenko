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
import { adminPath } from "@/lib/admin-base-path";
import type { MediaOption } from "@/lib/queries/media-admin";

type Props = {
  mediaOptions: MediaOption[];
  initialTeamHeroMediaId: string | null;
};

type Banner =
  | { kind: "error"; message: string }
  | { kind: "hint"; message: string }
  | { kind: "uploaded" }
  | { kind: "saved" };

async function resolutionHint(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const w = bmp.width;
    const h = bmp.height;
    bmp.close();
    const hints: string[] = [];
    if (w < 1100) {
      hints.push(
        `Širina je ${w}px — za vrlo oštar prikaz na retina ekranima bolje je oko 1200–1800px širine.`,
      );
    }
    const ratio = h > 0 ? w / h : 1;
    if (ratio > 0.92) {
      hints.push(
        "Više vertikalni kadar (omjer oko 3:4) najbolje popunjava karticu tima.",
      );
    }
    return hints.length ? hints.join(" ") : null;
  } catch {
    return null;
  }
}

export function TeamHomeMediaEditor({
  mediaOptions,
  initialTeamHeroMediaId,
}: Props) {
  const router = useRouter();
  const [extraMedia, setExtraMedia] = useState<MediaOption[]>([]);
  const [mediaId, setMediaId] = useState(() => initialTeamHeroMediaId ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMediaId(initialTeamHeroMediaId ?? "");
  }, [initialTeamHeroMediaId]);

  function previewUrl(): string | null {
    if (!mediaId) return null;
    const fromExtra = extraMedia.find((m) => m.id === mediaId);
    if (fromExtra) return fromExtra.url;
    return mediaOptions.find((m) => m.id === mediaId)?.url ?? null;
  }

  function save() {
    const fd = new FormData();
    fd.set("teamM1MediaId", mediaId);
    fd.set("clearLegacyTeamSlots", "1");
    startTransition(async () => {
      setBanner(null);
      const res = await saveSiteGlobalsAction(fd);
      if (res.ok) {
        setBanner({ kind: "saved" });
        router.refresh();
      } else if (res.error) {
        setBanner({ kind: "error", message: res.error });
      }
    });
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setBanner({ kind: "error", message: "Koristite sliku (JPG, PNG ili WebP)." });
      return;
    }
    const hint = await resolutionHint(file);
    setUploading(true);
    setBanner(null);
    try {
      const item = await uploadAdminMediaFile(file);
      setExtraMedia((prev) => [...prev.filter((p) => p.id !== item.id), item]);
      setMediaId(item.id);
      setBanner(hint ? { kind: "hint", message: hint } : { kind: "uploaded" });
    } catch (e) {
      setBanner({
        kind: "error",
        message: e instanceof Error ? e.message : "Otpremanje nije uspjelo.",
      });
    } finally {
      setUploading(false);
    }
  }

  const url = previewUrl();

  return (
    <AdminPanel
      title="Fotografija u bloku „Upoznajte tim“"
      description="Jedna fotografija za veliku karticu tima na početnoj. Tekstovi (ime, uloga, uvod) uređuju se u formi iznad."
    >
      <div className="rounded-xl border border-[#eadfce] bg-[#fff9f5]/80 p-5 md:p-6">
        <p className="text-sm leading-relaxed text-[#5c524a]">
          <strong className="text-[#3d342c]">Preporučena rezolucija:</strong>{" "}
          portret oko{" "}
          <strong className="text-[#c55a15]">1400 × 1850 px</strong> ili više (omjer
          blizu <strong className="text-[#c55a15]">3 : 4</strong>), JPG ili WebP visoke
          kvalitete (do 12 MB). Veća širina daje oštrij prikaz na velikim i retina
          ekranima.
        </p>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] shrink-0 overflow-hidden rounded-xl bg-[#f0e6dc] ring-1 ring-[#eadfce] sm:max-w-[320px]">
            {url ? (
              <Image
                src={url}
                alt=""
                fill
                className="object-cover object-[center_18%]"
                sizes="(max-width: 1024px) 320px, 360px"
                unoptimized={url.startsWith("http")}
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center px-4 text-center text-sm text-[#8a7b6e]">
                Nije odabrana fotografija — na sajtu se koristi podrazumijevani portret
                iz šablona.
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#eadfce] bg-white px-4 py-2.5 text-sm font-medium text-[#3d342c] hover:bg-white"
            >
              <ImageIcon className="h-4 w-4 text-[#f37021]" />
              Izaberi iz medija
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#eadfce] bg-white px-4 py-2.5 text-sm font-medium text-[#3d342c] hover:bg-white">
              <Upload className="h-4 w-4 text-[#f37021]" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadFile(f);
                }}
              />
              {uploading ? "Otpremanje…" : "Otpremi novu sliku"}
            </label>
            <button
              type="button"
              onClick={() => setMediaId("")}
              className="text-left text-sm text-[#8a7b6e] underline hover:text-[#c55a15]"
            >
              Ukloni — koristi podrazumijevanu fotografiju
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-[#6b5f54]">
        Sve datoteke su u{" "}
        <Link href={adminPath("media")} className="font-medium text-[#c55a15] underline">
          Medijima
        </Link>
        .
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="mt-5 rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c] disabled:opacity-60"
      >
        {pending ? "Čuva se…" : "Sačuvaj na sajtu"}
      </button>

      {banner?.kind === "error" ? (
        <p className="mt-3 text-sm text-red-700">{banner.message}</p>
      ) : null}
      {banner?.kind === "hint" ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-100">
            {banner.message}
          </p>
          <p className="text-sm text-emerald-800">
            Slika je otpremljena — kliknite „Sačuvaj na sajtu“ da je javnost vidi.
          </p>
        </div>
      ) : null}
      {banner?.kind === "uploaded" ? (
        <p className="mt-3 text-sm text-emerald-800">
          Slika je otpremljena — kliknite „Sačuvaj na sajtu“ da je javnost vidi.
        </p>
      ) : null}
      {banner?.kind === "saved" ? (
        <p className="mt-3 text-sm text-emerald-800">Sačuvano na sajtu.</p>
      ) : null}

      <AdminMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(item) => {
          setPickerOpen(false);
          setMediaId(item.id);
          setBanner(null);
        }}
        mediaOptions={[...mediaOptions, ...extraMedia]}
        imagesOnly
        title="Fotografija za blok „Upoznajte tim“"
      />
    </AdminPanel>
  );
}
