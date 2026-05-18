"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { adminPath } from "@/lib/admin-base-path";

import { resetPasswordConfirmAction } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordConfirmAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      window.location.assign(adminPath("login"));
    }
  }, [state.ok]);

  return (
    <form action={formAction} className="mx-auto mt-6 max-w-sm space-y-4 text-left">
      <input type="hidden" name="token" value={token} />
      <div>
        <label
          htmlFor="password"
          className="text-xs font-medium uppercase tracking-wider text-neutral-500"
        >
          Nova lozinka
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-1 focus:ring-neutral-800"
        />
      </div>
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
        {pending ? "Čuvam…" : "Postavi lozinku"}
      </button>
      <p className="text-center">
        <Link
          href={adminPath("login")}
          className="text-sm text-neutral-600 underline-offset-2 hover:underline"
        >
          Prijava
        </Link>
      </p>
    </form>
  );
}
