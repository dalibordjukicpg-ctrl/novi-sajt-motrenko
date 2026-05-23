"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Flash = { kind: "success" | "error"; message: string };

function flashFromParams(sp: URLSearchParams): Flash | null {
  if (sp.get("saved") === "1") {
    return { kind: "success", message: "Uspješno sačuvano." };
  }
  if (sp.get("created") === "1") {
    return { kind: "success", message: "Uspješno kreirano." };
  }
  if (sp.get("deleted") === "1") {
    return { kind: "success", message: "Uspješno obrisano." };
  }
  const err = sp.get("error");
  if (err === "forbidden") {
    return { kind: "error", message: "Nemate dozvolu za ovu radnju." };
  }
  if (err === "save") {
    return {
      kind: "error",
      message: "Čuvanje nije uspjelo. Pokušajte ponovo.",
    };
  }
  return null;
}

function AdminActionBannerInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    const next = flashFromParams(sp);
    if (!next) return;

    setFlash(next);

    sp.delete("saved");
    sp.delete("created");
    sp.delete("deleted");
    if (sp.get("error") === "forbidden" || sp.get("error") === "save") {
      sp.delete("error");
    }
    const q = sp.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  if (!flash) return null;

  return (
    <div
      role="status"
      className={cn(
        "mb-6 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm",
        flash.kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900",
      )}
    >
      {flash.message}
    </div>
  );
}

export function AdminActionBanner() {
  return (
    <Suspense fallback={null}>
      <AdminActionBannerInner />
    </Suspense>
  );
}
