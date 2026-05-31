"use client";

import { useActionState, useTransition } from "react";

import { cn } from "@/lib/utils";

import {
  cancelOtpAction,
  resendOtpFormAction,
  verifyOtpAction,
  type VerifyOtpState,
} from "./actions";

const initial: VerifyOtpState = { error: null, info: null };

export function VerifyOtpForm({ className }: { className?: string }) {
  const [state, formAction, pending] = useActionState(verifyOtpAction, initial);
  const [resendState, resendAction, resendPending] = useActionState(
    resendOtpFormAction,
    initial,
  );
  const [cancelPending, startCancel] = useTransition();

  const error = state.error ?? resendState.error;
  const info = state.info ?? resendState.info;

  return (
    <div className={cn("mx-auto max-w-sm space-y-4", className)}>
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="code"
            className="text-xs font-medium uppercase tracking-wider text-site-muted"
          >
            Verifikacioni kod
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000"
            className="mt-1 w-full rounded-lg border border-site-border bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-site-ink outline-none transition focus:border-site-brand focus:ring-2 focus:ring-site-brand/25"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-site-muted">
          <input
            type="checkbox"
            name="rememberDevice"
            className="mt-0.5 size-4 rounded border-site-border text-site-brand focus:ring-site-brand/25"
          />
          <span>Zapamti ovaj uređaj 30 dana</span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-site-brand py-2.5 text-sm font-semibold tracking-wide text-white shadow-site-card transition hover:bg-site-brand-hover disabled:opacity-60"
        >
          {pending ? "Provjera…" : "Potvrdi kod"}
        </button>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row">
        <form action={resendAction} className="flex-1">
          <button
            type="submit"
            disabled={resendPending || pending}
            className="w-full rounded-lg border border-site-border bg-white py-2.5 text-sm font-medium text-site-ink transition hover:bg-site-canvas disabled:opacity-60"
          >
            {resendPending ? "Slanje…" : "Pošalji novi kod"}
          </button>
        </form>
        <button
          type="button"
          disabled={cancelPending || pending}
          onClick={() => startCancel(() => cancelOtpAction())}
          className="w-full rounded-lg py-2.5 text-sm font-medium text-site-muted transition hover:text-site-ink disabled:opacity-60 sm:w-auto sm:px-4"
        >
          Odustani
        </button>
      </div>
    </div>
  );
}
