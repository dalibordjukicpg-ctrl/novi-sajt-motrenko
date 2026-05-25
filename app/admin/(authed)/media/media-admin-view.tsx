"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveMediaAltTranslationsAction } from "@/app/admin/(authed)/content/site-content-actions";
import { deleteMediaAction } from "@/app/admin/(authed)/media/actions";
import type { MediaAdminRow } from "@/lib/queries/media-admin";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

const LOC_LABEL: Record<Locale, string> = {
  me: "ME/SR",
  en: "EN",
  ru: "RU",
};

export function MediaAdminView({ items }: { items: MediaAdminRow[] }) {
  const router = useRouter();
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok?: boolean; error?: string } | null>(
    null,
  );
  const [pendingUp, startUpload] = useTransition();
  const [pendingSave, startSave] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  function handleDelete(item: MediaAdminRow) {
    const warn =
      "Obrisati ovaj fajl iz biblioteke medija? Ako se koristi na sajtu (logo, hero, članak), veza će se ukloniti.";
    if (!confirm(warn)) return;

    setDeletingId(item.id);
    setDeleteMsg(null);
    const fd = new FormData();
    fd.set("mediaId", item.id);
    startDelete(async () => {
      const res = await deleteMediaAction(fd);
      setDeletingId(null);
      if (res.error) {
        setDeleteMsg(res.error);
        return;
      }
      const extra =
        res.cleared && res.cleared.length > 0
          ? ` Uklonjeno iz: ${res.cleared.join(", ")}.`
          : "";
      setDeleteMsg(`Obrisano: ${item.filename}.${extra}`);
      router.refresh();
    });
  }

  const missingCount = items.filter((item) => !item.fileExists).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Mediji</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Za svaku stavku unesi alt tekst (SEO). Fajlovi idu u{" "}
          <code className="rounded bg-neutral-100 px-1">public/uploads</code>. Video za
          hero: kompresuj ispod ~20 MB (idealno 3–8 MB), MP4 H.264. Poslije redeploy-a na
          Hostingeru otpremi slike ponovo ako nestanu (baza ih pamti, fajl na disku može
          biti obrisan).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            <input
              type="file"
              accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov"
              className="hidden"
              disabled={pendingUp}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                startUpload(async () => {
                  setUploadMsg(null);
                  const fd = new FormData();
                  fd.set("file", file);
                  const res = await fetch("/api/admin/media/upload", {
                    method: "POST",
                    body: fd,
                  });
                  const j = (await res.json().catch(() => ({}))) as {
                    error?: string;
                  };
                  if (!res.ok) {
                    setUploadMsg(j.error ?? "Otpremanje nije uspjelo.");
                    return;
                  }
                  setUploadMsg("Fajl je otpremljen.");
                  router.refresh();
                });
              }}
            />
            {pendingUp ? "Otpremanje…" : "Otpremi sliku ili video"}
          </label>
          {uploadMsg && (
            <span className="text-sm text-neutral-600">{uploadMsg}</span>
          )}
        </div>
      </div>

      {missingCount > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {missingCount} fajlova nedostaje na disku (prazan prikaz u galeriji). To se
          dešava kad se sajt redeploy-uje — baza i dalje ima zapis, ali slika nije sačuvana
          na serveru. Otpremi ih ponovo ili obriši prazne stavke.
        </p>
      ) : null}

      {deleteMsg && (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-800">
          {deleteMsg}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-600">
          Još nema medija. Otpremi fajl iznad.
        </p>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startSave(async () => {
              setSaveMsg(null);
              const res = await saveMediaAltTranslationsAction(fd);
              setSaveMsg(res);
              if (res.ok) router.refresh();
            });
          }}
        >
          {saveMsg?.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
              {saveMsg.error}
            </p>
          )}
          {saveMsg?.ok && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
              Alt tekstovi sačuvani.
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
              >
                <div className="aspect-video bg-neutral-100">
                  {item.mimeType.startsWith("video/") ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-neutral-800 px-2 text-center text-white">
                      <span className="text-xs font-semibold uppercase tracking-wide text-white/90">
                        Video
                      </span>
                      <span className="text-[11px] text-white/70">
                        {(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  ) : !item.fileExists ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 bg-amber-50 px-3 text-center text-amber-900">
                      <span className="text-xs font-semibold">Fajl nedostaje</span>
                      <span className="text-[11px] leading-snug text-amber-800">
                        Otpremi ponovo ili obriši stavku
                      </span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.publicUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-xs font-mono text-neutral-500">
                    {item.id}
                  </p>
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {item.filename}
                  </p>
                  {locales.map((loc) => (
                    <label key={loc} className="block text-xs">
                      <span className="font-medium text-neutral-600">
                        Alt ({LOC_LABEL[loc]})
                      </span>
                      <input
                        name={`alt::${item.id}::${loc}`}
                        defaultValue={item.altByLocale[loc]}
                        className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={pendingDelete && deletingId === item.id}
                    onClick={() => handleDelete(item)}
                    className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    {pendingDelete && deletingId === item.id ? "Brišem…" : "Obriši"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={pendingSave}
            className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {pendingSave ? "Čuva se…" : "Sačuvaj alt tekstove"}
          </button>
        </form>
      )}
    </div>
  );
}
