"use client";

import Link from "next/link";
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  getTranslateSetupStatusAction,
  translateAndSaveAllSitePagesAction,
  translateAndSaveSitePageByIdAction,
} from "@/app/admin/(authed)/translate/actions";
import { adminPath } from "@/lib/admin-base-path";
import type { SitePageListItem } from "@/lib/queries/site-pages-admin";

type RowState = {
  pending?: boolean;
  error?: string;
  success?: boolean;
};

type Props = {
  pages: SitePageListItem[];
};

export function SitePagesAdminTable({ pages }: Props) {
  const router = useRouter();
  const [bulkPending, startBulk] = useTransition();
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [translateReady, setTranslateReady] = useState(false);

  useEffect(() => {
    void getTranslateSetupStatusAction().then((s) => {
      setTranslateReady(s.ready);
      setSetupHint(s.ready ? null : s.hint);
    });
  }, []);

  function setRow(pageId: string, patch: RowState) {
    setRowStates((prev) => ({
      ...prev,
      [pageId]: { ...prev[pageId], ...patch },
    }));
  }

  function translateOne(pageId: string) {
    setRow(pageId, { pending: true, error: undefined, success: false });
    void translateAndSaveSitePageByIdAction(pageId).then((res) => {
      if (res.ok) {
        setRow(pageId, { pending: false, success: true });
        router.refresh();
      } else {
        setRow(pageId, { pending: false, error: res.error });
      }
    });
  }

  function translateAll() {
    setBulkError(null);
    setBulkSummary(null);
    startBulk(async () => {
      const res = await translateAndSaveAllSitePagesAction();
      if (res.total === 0) {
        setBulkSummary("Nema stranica za prevod.");
        return;
      }
      if (res.ok) {
        setBulkSummary(`Sačuvano: ${res.succeeded} / ${res.total} stranica.`);
      } else {
        setBulkSummary(
          `Završeno: ${res.succeeded} / ${res.total}. Neuspjelo: ${res.failed.length}.`,
        );
        if (res.failed.length > 0) {
          const first = res.failed[0]!;
          setBulkError(
            res.failed.length === 1
              ? `${first.titleMe}: ${first.error}`
              : `${first.titleMe}: ${first.error} (+ još ${res.failed.length - 1})`,
          );
        }
      }
      router.refresh();
    });
  }

  const translateDisabled = !translateReady || bulkPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6dc] px-4 py-3">
        <div>
          <button
            type="button"
            disabled={translateDisabled || pages.length === 0}
            onClick={translateAll}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900 shadow-sm transition hover:bg-blue-100 disabled:opacity-50"
          >
            <Languages className="h-4 w-4 shrink-0" aria-hidden />
            {bulkPending ? "Prevodim sve…" : "Prevedi sve (EN/RU)"}
          </button>
          {setupHint && (
            <p className="mt-2 max-w-xl text-sm text-amber-800">{setupHint}</p>
          )}
          {bulkSummary && !bulkPending && (
            <p
              className={`mt-2 text-sm ${bulkError ? "text-amber-900" : "text-emerald-700"}`}
            >
              {bulkSummary}
            </p>
          )}
          {bulkError && !bulkPending && (
            <p className="mt-1 text-sm text-red-700">{bulkError}</p>
          )}
        </div>
        <p className="text-xs text-[#8a7b6e]">
          Prevod iz ME/SR u EN i RU i automatski upis u bazu.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#f0e6dc] text-xs uppercase tracking-wide text-[#8a7b6e]">
            <tr>
              <th className="px-4 py-3 font-medium">Naslov (ME)</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-[#6b5f54]"
                >
                  Nema stranica. Kreirajte prvu.
                </td>
              </tr>
            ) : (
              pages.map((p) => {
                const row = rowStates[p.id];
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#f8f0e8] last:border-0 hover:bg-[#fff9f5]/60"
                  >
                    <td className="px-4 py-3 font-medium text-[#2a2118]">
                      {p.titleMe}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#5c4f44]">
                      {p.slug}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.unlisted ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                            Skrivena
                          </span>
                        ) : null}
                        {p.published ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            Objavljeno
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#f0e6dc] px-2.5 py-0.5 text-xs text-[#6b5f54]">
                            Skica
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-wrap justify-end gap-3">
                          {p.published ? (
                            <Link
                              href={`/me/s/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-[#c55a15] hover:underline"
                            >
                              Pregled
                            </Link>
                          ) : null}
                          <Link
                            href={adminPath(`pages/${p.id}/edit`)}
                            className="text-sm font-medium text-[#2a2118] hover:underline"
                          >
                            Uredi
                          </Link>
                          <button
                            type="button"
                            disabled={translateDisabled || row?.pending}
                            onClick={() => translateOne(p.id)}
                            className="text-sm font-medium text-blue-800 hover:underline disabled:opacity-50"
                          >
                            {row?.pending ? "Prevodim…" : "Prevedi"}
                          </button>
                        </div>
                        {row?.success && (
                          <span className="text-xs text-emerald-700">
                            Sačuvano.
                          </span>
                        )}
                        {row?.error && (
                          <span className="max-w-[220px] text-right text-xs text-red-700">
                            {row.error}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
