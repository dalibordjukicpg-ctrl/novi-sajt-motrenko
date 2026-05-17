"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { getBookingIntakeLabels } from "@/lib/booking/intake-labels";
import { submitBookingRequestAction } from "@/lib/booking/submit-booking-request";
import type { BookingFormLocale } from "@/lib/validations/booking-request";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const labelCls =
  "block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500";
const inputCls =
  "mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-site-brand-solid focus:outline-none focus:ring-1 focus:ring-site-brand/35";
const sectionTitleCls = "text-sm font-semibold text-neutral-800";

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
  const [whoAttends, setWhoAttends] = useState("");
  const [state, formAction, pending] = useActionState(
    submitBookingRequestAction,
    {},
  );

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setWhoAttends("");
  }, [state.ok]);

  const err = (name: string) => state.fieldErrors?.[name];
  const showPartner =
    whoAttends === "couple_both" || whoAttends === "with_partner";

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

      {state.ok ? (
        <p
          className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {labels.success}
        </p>
      ) : null}

      {!state.ok && state.error && !state.fieldErrors ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}

      <form
        ref={formRef}
        action={formAction}
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
      </form>
    </div>
  );
}
