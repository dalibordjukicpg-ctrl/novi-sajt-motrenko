"use client";

import { useActionState } from "react";

import { cn } from "@/lib/utils";

import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { error: null };

/*
 * `redirectTo` ovdje uvijek dolazi iz server komponente (`page.tsx`) — tamo se
 * računa preko `ADMIN_BASE_PATH` iz env-a. Default fallback ovdje je sigurnosni
 * placeholder ako se komponenta upotrijebi bez prop-a.
 */
export function LoginForm({
  redirectTo = "/hrc-panel-74x",
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className={cn("mx-auto max-w-sm space-y-4", className)}>
      <input type="hidden" name="redirect" value={redirectTo} />
      <div>
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-wider text-site-muted"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-lg border border-site-border bg-white px-3 py-2.5 text-sm text-site-ink outline-none transition focus:border-site-brand focus:ring-2 focus:ring-site-brand/25"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="text-xs font-medium uppercase tracking-wider text-site-muted"
        >
          Lozinka
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-site-border bg-white px-3 py-2.5 text-sm text-site-ink outline-none transition focus:border-site-brand focus:ring-2 focus:ring-site-brand/25"
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-site-brand py-2.5 text-sm font-semibold tracking-wide text-white shadow-site-card transition hover:bg-site-brand-hover disabled:opacity-60"
      >
        {pending ? "Prijava…" : "Prijavi se"}
      </button>
    </form>
  );
}
