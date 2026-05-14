"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";

import type { MediaOption } from "@/lib/queries/media-admin";
import {
  articleFormSchema,
  type ArticleFormValues,
  type ArticleMutationResult,
} from "@/lib/validations/article";

const localeLabels: Record<
  keyof Pick<ArticleFormValues, "me" | "en" | "ru" | "tr">,
  string
> = {
  me: "Crnogorski (me)",
  en: "Engleski (en)",
  ru: "Ruski (ru)",
  tr: "Turski (tr)",
};

function LocaleFields({
  locale,
  label,
  register,
  errors,
}: {
  locale: keyof typeof localeLabels;
  label: string;
  register: UseFormRegister<ArticleFormValues>;
  errors: FieldErrors<ArticleFormValues>;
}) {
  const e = errors[locale];
  const fieldClass =
    "mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-800 focus:ring-1 focus:ring-neutral-800";

  return (
    <fieldset className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 shadow-sm">
      <legend className="px-1 text-sm font-semibold tracking-wide text-neutral-800">
        {label}
      </legend>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Slug (URL)
          </label>
          <input
            className={fieldClass}
            {...register(`${locale}.slug`)}
            autoComplete="off"
          />
          {e?.slug && (
            <p className="mt-1 text-xs text-red-600">{e.slug.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Naslov
          </label>
          <input className={fieldClass} {...register(`${locale}.title`)} />
          {e?.title && (
            <p className="mt-1 text-xs text-red-600">{e.title.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Izvod (opciono)
          </label>
          <textarea
            rows={3}
            className={fieldClass}
            {...register(`${locale}.excerpt`)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Tijelo (opciono)
          </label>
          <textarea
            rows={10}
            className={fieldClass}
            {...register(`${locale}.body`)}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Meta naslov (SEO)
          </label>
          <input className={fieldClass} {...register(`${locale}.metaTitle`)} />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Meta opis (SEO)
          </label>
          <input
            className={fieldClass}
            {...register(`${locale}.metaDescription`)}
          />
        </div>
      </div>
    </fieldset>
  );
}

type Props = {
  initialValues: ArticleFormValues;
  mediaOptions: MediaOption[];
  onSubmit: (data: ArticleFormValues) => Promise<ArticleMutationResult>;
  submitLabel: string;
  successMessage?: (postId: string) => string;
  resetOnSuccess?: boolean;
};
export function ArticleEditorForm({
  initialValues,
  mediaOptions,
  onSubmit,
  submitLabel,
  successMessage = (id) => `Sačuvano. ID: ${id}`,
  resetOnSuccess = false,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const coverId = watch("coverMediaId");
  const coverPreview = useMemo(() => {
    if (!coverId) return null;
    return mediaOptions.find((m) => m.id === coverId)?.url ?? null;
  }, [coverId, mediaOptions]);
  const submit = (data: ArticleFormValues) => {
    setServerError(null);
    setBanner(null);
    startTransition(async () => {
      const result = await onSubmit(data);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setBanner(successMessage(result.postId));
      if (resetOnSuccess) {
        reset(initialValues);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="mx-auto max-w-3xl space-y-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            className="size-4 rounded border-neutral-300"
            {...register("published")}
          />
          Objavi
        </label>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900">
          Naslovna slika (lista novosti)
        </h3>
        <p className="mt-1 text-xs text-neutral-600">
          Prikazuje se na početnoj stranici. Otpremi sliku u{" "}
          <Link
            href="/admin/media"
            className="font-medium text-teal-800 underline"
          >
            Mediji
          </Link>
          .
        </p>
        <select
          className="mt-3 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-800 focus:ring-1 focus:ring-neutral-800"
          {...register("coverMediaId")}
        >
          <option value="">Bez slike</option>
          {mediaOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.coverMediaId && (
          <p className="mt-1 text-xs text-red-600">
            {errors.coverMediaId.message}
          </p>
        )}
        {coverPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPreview}
            alt=""
            className="mt-4 max-h-40 w-full max-w-md rounded-lg border border-neutral-200 object-cover"
          />
        ) : null}
      </div>
      {(Object.keys(localeLabels) as (keyof typeof localeLabels)[]).map(
        (loc) => (
          <LocaleFields
            key={loc}
            locale={loc}
            label={localeLabels[loc]}
            register={register}
            errors={errors}
          />
        ),
      )}

      {serverError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      )}
      {banner && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {banner}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Snimam…" : submitLabel}
      </button>
    </form>
  );
}
