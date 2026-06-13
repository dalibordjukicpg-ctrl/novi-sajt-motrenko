"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";

type Props = {
  notifyTo: string;
};

type HealthEmail = {
  resendApiKeyConfigured?: boolean;
  resendApiKeyPrefix?: string | null;
  resendFromDomain?: string | null;
};

type Feedback =
  | { kind: "ok"; to: string; resendId?: string | null }
  | { kind: "err"; message: string; hint?: string };

export function UpitnikTestEmailPanel({ notifyTo }: Props) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [health, setHealth] = useState<HealthEmail | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health/email", { cache: "no-store" });
        const data = (await res.json()) as { email?: HealthEmail };
        if (!cancelled) setHealth(data.email ?? null);
      } catch {
        if (!cancelled) setHealth(null);
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resendOk = health?.resendApiKeyConfigured === true;

  async function sendTest() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/upitnik/test-email", {
        method: "POST",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        to?: string;
        resendId?: string | null;
        error?: string;
        hint?: string;
        detail?: string;
        status?: number;
      };

      if (res.ok && data.ok) {
        setFeedback({
          kind: "ok",
          to: data.to ?? notifyTo,
          resendId: data.resendId,
        });
        return;
      }

      const parts = [data.error ?? "Slanje nije uspjelo."];
      if (data.status) parts.push(`HTTP ${data.status}`);
      if (data.detail) parts.push(data.detail);
      setFeedback({
        kind: "err",
        message: parts.join(" — "),
        hint: data.hint,
      });
    } catch (e) {
      setFeedback({
        kind: "err",
        message: e instanceof Error ? e.message : "Mrežna greška.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-[#8a7b6e]">
        Server: <strong className="text-[#2a2118]">{host || "—"}</strong>
        {isLocal ? (
          <span className="ml-2 text-amber-700">
            (lokalno — Resend ključ mora biti u .env fajlu)
          </span>
        ) : null}
      </p>

      {feedback?.kind === "ok" ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Test email je uspješno poslat.</p>
            <p className="mt-1 text-emerald-700">
              Provjerite inbox (i spam): <strong>{feedback.to}</strong>
              {feedback.resendId ? (
                <span className="block mt-1 text-xs text-emerald-600 font-mono">
                  Resend ID: {feedback.resendId}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {feedback?.kind === "err" ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Slanje nije uspjelo.</p>
            <p className="mt-1 text-red-700">{feedback.message}</p>
            {feedback.hint ? (
              <p className="mt-2 text-xs text-red-600">{feedback.hint}</p>
            ) : null}
            {isLocal ? (
              <p className="mt-2 text-xs text-red-600">
                Kontakt forma radi na produkciji jer tamo postoji RESEND_API_KEY.
                Lokalno dodajte isti ključ u <code className="px-1 rounded bg-red-100">.env</code> i restartujte <code className="px-1 rounded bg-red-100">npm run dev</code>.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {healthLoading ? (
          <span className="text-xs text-[#8a7b6e]">Provjeravam Resend…</span>
        ) : resendOk ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Resend aktivan ({health?.resendApiKeyPrefix ?? "re_…"})
            {health?.resendFromDomain ? ` · ${health.resendFromDomain}` : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Resend nije podešen na ovom serveru
          </span>
        )}
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[#e8682a] px-4 py-2 text-xs font-bold text-white hover:bg-[#c45418] transition shadow-sm disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Šaljem...
            </>
          ) : (
            <>
              <Send size={13} /> Pošalji probni email
            </>
          )}
        </button>
      </div>
    </div>
  );
}
