"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { clearSiteCacheAction } from "@/app/admin/(authed)/cache-actions";
import type { ClearCacheState } from "@/app/admin/(authed)/cache-actions";
import { cn } from "@/lib/utils";

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Čistim…" : "Očisti keš";
}

export function ClearSiteCacheButton() {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ClearCacheState,
    FormData
  >(clearSiteCacheAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
      <form action={formAction} className="flex flex-col items-end gap-1">
        <button
          type="submit"
          title="Revalidacija Next.js keša za javni sajt i admin (ne briše .next folder)"
          className={cn(
            "rounded-lg border-2 border-[#f37021] bg-[#fff5ef] px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-[#c55a15]",
            "hover:bg-[#f37021] hover:text-white",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f37021]",
          )}
        >
          <SubmitLabel />
        </button>
      </form>
      {state?.message ? (
        <span
          className={cn(
            "max-w-[14rem] text-right text-[11px] leading-snug",
            state.ok ? "text-emerald-800" : "text-red-700",
          )}
          role="status"
        >
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
