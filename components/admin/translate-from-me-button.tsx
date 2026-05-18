"use client";

import { Languages } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { getTranslateSetupStatusAction } from "@/app/admin/(authed)/translate/actions";

type Props = {
  disabled?: boolean;
  onGenerate: () => Promise<{ error?: string } | void>;
  className?: string;
  label?: string;
  pendingLabel?: string;
};

export function TranslateFromMeButton({
  disabled,
  onGenerate,
  className = "",
  label = "Prevedi i sačuvaj EN/RU",
  pendingLabel = "Prevodim i čuvam…",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);

  useEffect(() => {
    void getTranslateSetupStatusAction().then((s) => {
      if (!s.ready) {
        setSetupHint(s.hint);
        setProviderLabel(null);
      } else {
        setSetupHint(null);
        setProviderLabel(
          s.provider === "openai"
            ? "OpenAI"
            : s.provider
              ? s.provider.toUpperCase()
              : null,
        );
      }
    });
  }, []);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled || pending || setupHint != null}
        onClick={() => {
          setError(null);
          setSuccess(false);
          startTransition(async () => {
            const res = await onGenerate();
            if (res && "error" in res && res.error) {
              setError(res.error);
            } else {
              setSuccess(true);
            }
          });
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900 shadow-sm transition hover:bg-blue-100 disabled:opacity-50"
      >
        <Languages className="h-4 w-4 shrink-0" aria-hidden />
        {pending ? pendingLabel : label}
      </button>
      {providerLabel && !error && !setupHint && (
        <p className="mt-1 text-xs text-neutral-500">
          Aktivan provajder: <strong>{providerLabel}</strong>
        </p>
      )}
      {setupHint && !error && (
        <p className="mt-2 text-sm text-amber-800">{setupHint}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {success && !error && (
        <p className="mt-1 text-sm text-emerald-700">Sačuvano.</p>
      )}
    </div>
  );
}
