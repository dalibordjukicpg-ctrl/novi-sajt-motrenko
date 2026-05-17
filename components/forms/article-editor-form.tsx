"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";

import { CoverMediaField } from "@/components/admin/cover-media-field";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import type { MediaOption } from "@/lib/queries/media-admin";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import {
  articleFormSchema,
  type ArticleFormValues,
  type ArticleMutationResult,
} from "@/lib/validations/article";

const localeLabels = {
  me: "Crnogorski (MNE)",
} satisfies Record<Locale, string>;

function LocaleFields({
  locale,
  label,
  register,
  errors,
  setValue,
  watch,
  mediaOptions,
}: {
  locale: Locale;
  label: string;
  register: UseFormRegister<ArticleFormValues>;
  errors: FieldErrors<ArticleFormValues>;
  setValue: UseFormSetValue<ArticleFormValues>;
  watch: UseFormWatch<ArticleFormValues>;
  mediaOptions: MediaOption[];
}) {
  const bodyHtml = watch(`${locale}.body`) ?? "";
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
          <div className="mt-1">
            <TiptapEditor
              initialHtml={bodyHtml}
              mediaOptions={mediaOptions}
              placeholder="Tekst članka…"
              onHtmlChange={(html) =>
                setValue(`${locale}.body`, html, { shouldDirty: true })
              }
            />
          </div>
          <input type="hidden" {...register(`${locale}.body`)} />
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
    setValue,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const coverId = watch("coverMediaId");
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

      <CoverMediaField
        mediaOptions={mediaOptions}
        value={coverId ?? ""}
        onChange={(id) => setValue("coverMediaId", id, { shouldDirty: true })}
        error={errors.coverMediaId?.message}
      />
      <input type="hidden" {...register("coverMediaId")} />
      {locales.map((loc) => (
        <LocaleFields
          key={loc}
          locale={loc}
          label={localeLabels[loc]}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          mediaOptions={mediaOptions}
        />
      ))}

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
