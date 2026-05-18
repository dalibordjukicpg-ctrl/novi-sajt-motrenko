"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { adminPath } from "@/lib/admin-base-path";

import { verifyEmailConfirmAction } from "./actions";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    verifyEmailConfirmAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      window.location.assign(adminPath("login"));
    }
  }, [state.ok]);

  return (
    <form action={formAction} className="mx-auto mt-6 max-w-sm space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-neutral-600">
        Potvrdite email adresu jednim klikom.
      </p>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Email potvrđen. Preusmjeravamo na prijavu…
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "…" : "Potvrdi email"}
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
