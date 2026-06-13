"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** Ukloni ?err=missing_api_key iz URL-a kad je Resend već podešen (stara greška u bookmarku/historiji). */
  clearStaleMissingKeyErr?: boolean;
};

export function ClearStaleAdminQuery({ clearStaleMissingKeyErr }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!clearStaleMissingKeyErr) return;
    const err = searchParams.get("err");
    if (err !== "missing_api_key") return;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("err");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [clearStaleMissingKeyErr, pathname, router, searchParams]);

  return null;
}
