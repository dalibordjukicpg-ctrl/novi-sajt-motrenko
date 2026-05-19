"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Javni fallback kad SSR padne (npr. baza / env na Hostingeru). */
export default function LocaleError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[LocaleError]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-xl font-semibold text-site-ink">Privremena greška</h1>
      <p className="text-sm leading-relaxed text-site-muted">
        Stranica se nije mogla učitati. Ako ste upravo deployovali, provjerite na
        Hostingeru da je <code className="text-xs">DATABASE_URL</code> tačan (baza, korisnik,
        lozinka, host iz panela) i pokrenite redeploy.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="site-card-glass w-fit px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-site-ink"
      >
        Pokušaj ponovo
      </button>
    </main>
  );
}
