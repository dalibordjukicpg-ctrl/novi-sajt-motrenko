"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Locale } from "@/lib/i18n";
import {
  contactFormClientSchema,
  type ContactFormClientValues,
} from "@/lib/validations/contact-form";
import { cn } from "@/lib/utils";

const labelCls =
  "block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500";
const inputCls =
  "mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#f37021] focus:outline-none focus:ring-1 focus:ring-[#f37021]/35";

type Props = {
  locale: Locale;
  privacyHref: string;
  className?: string;
};

export function ContactForm({ locale, privacyHref, className }: Props) {
  const hpRef = useRef<HTMLInputElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formDefaults = useMemo<ContactFormClientValues>(
    () => ({
      locale,
      fullName: "",
      email: "",
      phone: "",
      message: "",
      inquiryType: "",
      consentAccepted: false,
    }),
    [locale],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormClientValues>({
    resolver: zodResolver(contactFormClientSchema),
    defaultValues: formDefaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSuccess(false);
    const body = {
      ...values,
      inquiryType: values.inquiryType?.trim() ? values.inquiryType : undefined,
      form_hp_token: hpRef.current?.value?.trim() ?? "",
    };

    let res: Response;
    try {
      res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setSubmitError(
        "Mrežna greška. Provjerite vezu i pokušajte ponovo.",
      );
      return;
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      setSubmitError("Odgovor servera nije mogao biti obrađen. Pokušajte kasnije.");
      return;
    }

    if (typeof data !== "object" || data === null || !("ok" in data)) {
      setSubmitError("Slanje nije uspjelo. Pokušajte kasnije.");
      return;
    }

    const payload = data as {
      ok: boolean;
      error?: string;
      fieldErrors?: Record<string, string>;
    };

    if (res.status === 429) {
      setSubmitError(
        payload.error ??
          "Previše zahtjeva. Sačekajte pa pokušajte ponovo.",
      );
      return;
    }

    if (!payload.ok) {
      if (payload.fieldErrors) {
        for (const [key, msg] of Object.entries(payload.fieldErrors)) {
          if (
            key === "locale" ||
            key === "fullName" ||
            key === "email" ||
            key === "phone" ||
            key === "message" ||
            key === "inquiryType" ||
            key === "consentAccepted"
          ) {
            setError(key, { type: "server", message: msg });
          }
        }
      }
      setSubmitError(
        payload.error ??
          (res.status >= 400
            ? "Provjerite podatke i pokušajte ponovo."
            : "Slanje nije uspjelo."),
      );
      return;
    }

    if (!res.ok) {
      setSubmitError(
        payload.error ?? "Slanje nije uspjelo. Pokušajte kasnije.",
      );
      return;
    }

    setSuccess(true);
    reset(formDefaults);
    if (hpRef.current) hpRef.current.value = "";
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#f0e6dc] bg-white/95 px-6 py-8 shadow-[0_20px_50px_-18px_rgba(26,18,8,0.12)] sm:px-8",
        className,
      )}
    >
      <header className="border-b border-neutral-100 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f37021]">
          Kontakt
        </p>
        <h2
          className="mt-2 text-2xl font-light leading-tight text-neutral-900"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Pošaljite nam poruku
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Popunite formu i odgovorimo vam u najkraćem roku. Obavezna polja su
          označena zvjezdicom.
        </p>
      </header>

      {success ? (
        <p
          className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Hvala! Poruka je poslata. Prilog u PDF-u (A4, sa logom i svim podacima) stiže na naš e-mail za evidenciju; odgovorimo vam u najkraćem roku.
        </p>
      ) : null}

      {submitError ? (
        <p
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <form className="relative mt-6 space-y-5" onSubmit={onSubmit} noValidate>
        <input type="hidden" {...register("locale")} />

        {/* Antibot — potpuno skriveno (hidden + van tab reda + van SR stabla). */}
        <input
          ref={hpRef}
          type="text"
          name="form_hp_dummy"
          hidden
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          data-1p-ignore
          data-lpignore="true"
          data-bwignore="true"
          defaultValue=""
        />

        <div>
          <label htmlFor="contact_fullName" className={labelCls}>
            Ime i prezime *
          </label>
          <input
            id="contact_fullName"
            type="text"
            autoComplete="name"
            className={inputCls}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact_email" className={labelCls}>
              Email *
            </label>
            <input
              id="contact_email"
              type="email"
              autoComplete="email"
              className={inputCls}
              {...register("email")}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="contact_phone" className={labelCls}>
              Telefon *
            </label>
            <input
              id="contact_phone"
              type="tel"
              autoComplete="tel"
              className={inputCls}
              {...register("phone")}
            />
            {errors.phone ? (
              <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="contact_inquiryType" className={labelCls}>
            Razlog javljanja / tip usluge (opcionalno)
          </label>
          <input
            id="contact_inquiryType"
            type="text"
            className={inputCls}
            placeholder="npr. konsultacija, IVF, ginekologija…"
            {...register("inquiryType")}
          />
          {errors.inquiryType ? (
            <p className="mt-1 text-xs text-red-600">
              {errors.inquiryType.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contact_message" className={labelCls}>
            Poruka *
          </label>
          <textarea
            id="contact_message"
            rows={5}
            className={cn(inputCls, "min-h-[120px] resize-y")}
            {...register("message")}
          />
          {errors.message ? (
            <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <input
            id="contact_consent"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#f37021] focus:ring-[#f37021]/40"
            {...register("consentAccepted")}
          />
          <label
            htmlFor="contact_consent"
            className="text-sm leading-snug text-neutral-700"
          >
            Saglasan/sam sam sa{" "}
            <Link
              href={privacyHref}
              className="font-medium text-[#f37021] underline-offset-2 hover:underline"
            >
              obradom ličnih podataka
            </Link>{" "}
            u svrhu odgovora na upit. *
          </label>
        </div>
        {errors.consentAccepted ? (
          <p className="text-xs text-red-600">
            {errors.consentAccepted.message as string}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center bg-[#1a1208] px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#2a2215] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
        >
          {isSubmitting ? "Šaljem…" : "Pošalji poruku"}
        </button>
      </form>
    </div>
  );
}
