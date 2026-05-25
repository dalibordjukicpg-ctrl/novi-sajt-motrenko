"use client";

import Link from "next/link";
import { FileText, Upload, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { getBookingIntakeLabels } from "@/lib/booking/intake-labels";
import type { SubmitBookingState } from "@/lib/booking/submit-booking-request";
import type { BookingFormLocale } from "@/lib/validations/booking-request";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const labelCls =
  "block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500";
const inputCls =
  "mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-site-brand-solid focus:outline-none focus:ring-1 focus:ring-site-brand/35";
const sectionTitleCls = "text-sm font-semibold text-neutral-800";

type PickedAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filesToPicked(files: FileList | File[]): PickedAttachment[] {
  return Array.from(files).map((file, index) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    file,
    previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
  }));
}

function syncInputFiles(input: HTMLInputElement, files: File[]) {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  input.files = dt.files;
}

type Props = {
  locale: Locale;
  privacyHref: string;
  callDisplay: string;
  callHref?: string;
};

export function BookingIntakeForm({
  locale,
  privacyHref,
  callDisplay,
  callHref,
}: Props) {
  const bookingLocale = locale as BookingFormLocale;
  const labels = useMemo(
    () => getBookingIntakeLabels(bookingLocale),
    [bookingLocale],
  );
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const attachmentsInputRef = useRef<HTMLInputElement>(null);
  const [whoAttends, setWhoAttends] = useState("");
  const [pickedAttachments, setPickedAttachments] = useState<PickedAttachment[]>(
    [],
  );
  const [fileInputKey, setFileInputKey] = useState(0);
  const [state, setState] = useState<SubmitBookingState>({});
  const [pending, setPending] = useState(false);

  const attachmentsRef = useRef(pickedAttachments);
  attachmentsRef.current = pickedAttachments;

  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setWhoAttends("");
    setPickedAttachments((prev) => {
      for (const item of prev) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
    setFileInputKey((k) => k + 1);
    successRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.ok]);

  const err = (name: string) => state.fieldErrors?.[name];
  const showPartner =
    whoAttends === "couple_both" || whoAttends === "with_partner";

  function applyPickedFiles(files: File[]) {
    setPickedAttachments((prev) => {
      for (const item of prev) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      const next = filesToPicked(files);
      if (attachmentsInputRef.current) {
        syncInputFiles(attachmentsInputRef.current, files);
      }
      return next;
    });
  }

  function handleAttachmentsChange(fileList: FileList | null) {
    applyPickedFiles(Array.from(fileList ?? []));
  }

  function removeAttachment(id: string) {
    const next = pickedAttachments.filter((item) => item.id !== id);
    const removed = pickedAttachments.find((item) => item.id === id);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    applyPickedFiles(next.map((item) => item.file));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current || pending) return;
    setPending(true);
    setState({});

    try {
      const fd = new FormData(formRef.current);
      const res = await fetch("/api/booking", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as SubmitBookingState;
      setState(json);
    } catch {
      setState({ error: labels.errorGeneric });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full max-h-[min(85vh,920px)] overflow-y-auto rounded-2xl border border-site-border bg-site-card p-6 shadow-[0_16px_56px_-12px_rgb(0_0_0/0.06),0_4px_16px_-4px_rgb(0_0_0/0.03)] ring-1 ring-black/[0.02] md:p-8",
      )}
    >
      <header className="border-b border-neutral-100 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-site-brand">
          {labels.formEyebrow}
        </p>
        <h3
          className="mt-2 text-2xl font-light leading-tight text-neutral-900 md:text-[1.65rem]"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          {labels.formTitle}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
          {labels.formLead}
        </p>
      </header>

      {!state.ok && state.error && !state.fieldErrors ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="relative mt-6 space-y-8 pb-2"
      >
        <input type="hidden" name="locale" value={locale} />

        <div className="sr-only" aria-hidden>
          <label htmlFor="company_website">Website</label>
          <input
            id="company_website"
            name="company_website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <fieldset className="space-y-4">
          <legend className={cn(sectionTitleCls, "mb-1")}>
            {labels.sectionBasic}
          </legend>

          <div>
            <label htmlFor="fullName" className={labelCls}>
              {labels.fullName} *
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              className={cn(inputCls, err("fullName") && "border-red-400")}
            />
            {err("fullName") ? (
              <p className="mt-1 text-xs text-red-600">{err("fullName")}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className={labelCls}>
                {labels.email} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={cn(inputCls, err("email") && "border-red-400")}
              />
              {err("email") ? (
                <p className="mt-1 text-xs text-red-600">{err("email")}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>
                {labels.phone} *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                className={cn(inputCls, err("phone") && "border-red-400")}
              />
              {err("phone") ? (
                <p className="mt-1 text-xs text-red-600">{err("phone")}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="whoAttends" className={labelCls}>
              {labels.whoAttends} *
            </label>
            <select
              id="whoAttends"
              name="whoAttends"
              required
              value={whoAttends}
              onChange={(e) => setWhoAttends(e.target.value)}
              className={cn(
                inputCls,
                err("whoAttends") && "border-red-400",
                !whoAttends && "text-neutral-400",
              )}
            >
              <option value="" disabled>
                {labels.selectPlaceholder}
              </option>
              <option value="patient_only">
                {labels.whoAttendsOptions.patient_only}
              </option>
              <option value="couple_both">
                {labels.whoAttendsOptions.couple_both}
              </option>
              <option value="with_partner">
                {labels.whoAttendsOptions.with_partner}
              </option>
            </select>
            {err("whoAttends") ? (
              <p className="mt-1 text-xs text-red-600">{err("whoAttends")}</p>
            ) : null}
          </div>

          {showPartner ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="partnerFullName" className={labelCls}>
                  {labels.partnerName}
                </label>
                <input
                  id="partnerFullName"
                  name="partnerFullName"
                  autoComplete="name"
                  className={cn(
                    inputCls,
                    err("partnerFullName") && "border-red-400",
                  )}
                />
                {err("partnerFullName") ? (
                  <p className="mt-1 text-xs text-red-600">
                    {err("partnerFullName")}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="partnerPhone" className={labelCls}>
                  {labels.partnerPhone}
                </label>
                <input
                  id="partnerPhone"
                  name="partnerPhone"
                  type="tel"
                  autoComplete="tel"
                  className={inputCls}
                />
              </div>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className={cn(sectionTitleCls, "mb-1")}>
            {labels.sectionReasonVisit}
          </legend>

          <div>
            <label htmlFor="whatBroughtYou" className={labelCls}>
              {labels.whatBroughtYou} *
            </label>
            <textarea
              id="whatBroughtYou"
              name="whatBroughtYou"
              required
              rows={5}
              placeholder={labels.whatBroughtYouPh}
              className={cn(
                inputCls,
                "min-h-[7.5rem] resize-y",
                err("whatBroughtYou") && "border-red-400",
              )}
            />
            {err("whatBroughtYou") ? (
              <p className="mt-1 text-xs text-red-600">
                {err("whatBroughtYou")}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="tryingConceiveDuration" className={labelCls}>
              {labels.tryingConceive}
            </label>
            <select
              id="tryingConceiveDuration"
              name="tryingConceiveDuration"
              defaultValue=""
              className={inputCls}
            >
              <option value="">{labels.ttcUnset}</option>
              <option value="lt_6m">{labels.ttcOptions.lt_6m}</option>
              <option value="6_12m">{labels.ttcOptions["6_12m"]}</option>
              <option value="12_24m">{labels.ttcOptions["12_24m"]}</option>
              <option value="gt_24m">{labels.ttcOptions.gt_24m}</option>
              <option value="prefer_not">
                {labels.ttcOptions.prefer_not}
              </option>
              <option value="na">{labels.ttcOptions.na}</option>
            </select>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-neutral-100 pt-6">
          <legend className={cn(sectionTitleCls, "mb-1")}>
            {labels.sectionAttachments}
          </legend>

          <div>
            <span className={labelCls}>{labels.attachmentsLabel}</span>

            <input
              key={fileInputKey}
              ref={attachmentsInputRef}
              id="attachments"
              name="attachments"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={(e) => handleAttachmentsChange(e.target.files)}
            />

            <div
              className={cn(
                "mt-1.5 rounded-md border border-neutral-200 bg-white p-3",
                err("attachments") && "border-red-400",
              )}
            >
              <button
                type="button"
                onClick={() => attachmentsInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-site-brand px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_-8px_rgba(243,112,33,0.55)] transition-colors hover:bg-site-brand-hover"
              >
                <Upload className="h-4 w-4" aria-hidden />
                {labels.attachmentsChoose}
              </button>

              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                {labels.attachmentsHint}
              </p>

              {pickedAttachments.length > 0 ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {pickedAttachments.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-site-brand/15 bg-site-surface-a/40 p-2"
                    >
                      {item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-md border border-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-site-brand/20 bg-white text-site-brand">
                          <FileText className="h-6 w-6" aria-hidden />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-neutral-800">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(item.id)}
                        className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`${labels.attachmentsRemove}: ${item.file.name}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {err("attachments") ? (
              <p className="mt-1 text-xs text-red-600">{err("attachments")}</p>
            ) : null}
          </div>
        </fieldset>

        <div className="border-t border-neutral-100 pt-5">
          <label className="flex items-start gap-3 text-xs leading-relaxed text-neutral-600">
            <input
              name="consentAccepted"
              type="checkbox"
              value="on"
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-site-brand focus:ring-site-brand"
            />
            <span>
              {labels.consent}{" "}
              <Link
                href={privacyHref}
                className="font-medium text-[#c55a15] underline-offset-2 hover:underline"
              >
                {labels.consentPrivacyPrefix} {labels.consentPrivacyLink}
              </Link>
              .
            </span>
          </label>
          {err("consentAccepted") ? (
            <p className="mt-2 text-xs text-red-600">
              {labels.consentRequired}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-left">
            {labels.callOr}{" "}
            {callHref ? (
              <a
                href={callHref}
                className="text-neutral-800 underline-offset-2 hover:text-[#c55a15] hover:underline"
              >
                {callDisplay}
              </a>
            ) : (
              <span className="text-neutral-800">{callDisplay}</span>
            )}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[3rem] w-full shrink-0 items-center justify-center rounded-md bg-site-brand px-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_28px_-8px_rgba(243,112,33,0.3)] transition-colors hover:bg-site-brand-hover disabled:opacity-60 sm:w-auto sm:min-w-[14rem]"
          >
            {pending ? labels.submitting : labels.submit}
          </button>
        </div>

        {state.ok ? (
          <div
            ref={successRef}
            className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
            role="status"
          >
            <p className="text-base font-semibold text-emerald-950">
              {labels.successTitle}
            </p>
            <p className="mt-1.5 leading-relaxed">{labels.success}</p>
          </div>
        ) : null}
      </form>
    </div>
  );
}
