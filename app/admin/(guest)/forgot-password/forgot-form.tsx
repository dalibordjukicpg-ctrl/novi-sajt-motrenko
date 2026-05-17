"use client";

import { useActionState } from "react";

import { requestPasswordResetAction } from "./actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    {},
  );

  return (
    <form action={formAction} className="mx-auto mt-6 max-w-sm space-y-4">
      <div>
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-wider text-neutral-500"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-1 focus:ring-neutral-800"
        />
      </div>
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Ako nalog postoji, poslali smo uputstvo na email.
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Šaljem…" : "Pošalji link"}
      </button>
    </form>
  );
}
