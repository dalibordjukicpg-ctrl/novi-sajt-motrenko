"use client";

import Link from "next/link";
import { useState } from "react";
import { ImageIcon, Images } from "lucide-react";

import {
  AdminMediaPicker,
  uploadAdminMediaFile,
} from "@/components/admin/admin-media-picker";
import { adminPath } from "@/lib/admin-base-path";
import type { MediaOption } from "@/lib/queries/media-admin";

type Props = {
  mediaOptions: MediaOption[];
  value: string;
  onChange: (mediaId: string) => void;
  error?: string;
};

export function CoverMediaField({ mediaOptions, value, onChange, error }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const preview =
    mediaOptions.find((m) => m.id === value)?.url ?? previewUrl;

  async function uploadFromComputer(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Dozvoljene su samo slike za naslovnu.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const item = await uploadAdminMediaFile(file);
      onChange(item.id);
      setPreviewUrl(item.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Greška pri otpremanju.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-900">Naslovna slika (lista novosti)</h3>
      <p className="mt-1 text-xs text-neutral-600">
        Izaberi iz galerije ili otpremi novu. Sve slike su u{" "}
        <Link href={adminPath("media")} className="font-medium text-[#c55a15] underline">
          Mediji
        </Link>
        .
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          <Images className="h-4 w-4 text-[#f37021]" aria-hidden />
          Iz galerije
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
          <ImageIcon className="h-4 w-4 text-[#f37021]" aria-hidden />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadFromComputer(file);
            }}
          />
          {uploading ? "Otpremanje…" : "Otpremi sa računara"}
        </label>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setPreviewUrl(null);
            }}
            className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            Ukloni
          </button>
        ) : null}
      </div>

      <select
        className="mt-3 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-800 focus:ring-1 focus:ring-neutral-800"
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          onChange(id);
          const url = mediaOptions.find((m) => m.id === id)?.url ?? null;
          setPreviewUrl(url);
        }}
      >
        <option value="">Bez slike</option>
        {mediaOptions
          .filter((m) => m.mimeType.startsWith("image/"))
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
      </select>

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      {uploadError ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {uploadError}
        </p>
      ) : null}

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="mt-4 max-h-48 w-full max-w-md rounded-lg border border-neutral-200 object-cover"
        />
      ) : null}

      <AdminMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mediaOptions={mediaOptions}
        imagesOnly
        title="Naslovna slika"
        onPick={(item) => {
          onChange(item.id);
          setPreviewUrl(item.url);
        }}
      />
    </div>
  );
}
