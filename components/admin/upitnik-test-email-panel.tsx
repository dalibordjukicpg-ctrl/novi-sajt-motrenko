"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";

type Props = {
  notifyTo: string;
  resendConfigured: boolean;
};

type Feedback =
  | { kind: "ok"; to: string; resendId?: string | null }
  | { kind: "err"; message: string; detail?: string };

export function UpitnikTestEmailPanel({ notifyTo, resendConfigured }: Props) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function sendTest() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/upitnik/test-email", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        to?: string;
        resendId?: string | null;
        error?: string;
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
        detail: data.detail,
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
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {resendConfigured ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" /> RESEND_API_KEY postavljen
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <span className="size-1.5 rounded-full bg-amber-500" /> RESEND_API_KEY nije postavljen — mailovi neće biti poslati
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
