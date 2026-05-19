"use client";

import { Languages, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getTranslateSetupStatusAction,
  translateAndSaveAllSiteStringsAction,
  translateAndSaveNavLinkByIdAction,
  translateAndSavePostByIdAction,
  translateAndSaveSitePageByIdAction,
  type TranslateInventory,
} from "@/app/admin/(authed)/translate/actions";

type CategoryKey = "cmsPages" | "blogPosts" | "teamPosts" | "navLinks" | "siteStrings";

type RunState = {
  inProgress: boolean;
  current: number;
  total: number;
  currentLabel: string;
  done: number;
  failed: number;
  status: "idle" | "running" | "done" | "error";
  lastError?: string;
};

type Props = {
  inventory: TranslateInventory;
};

const CATEGORY_META: Record<CategoryKey, { title: string; description: string }> = {
  cmsPages: {
    title: "Stranice (CMS)",
    description: "Sve statičke stranice /s/slug.",
  },
  blogPosts: {
    title: "Blog članci",
    description: "Lista članaka iz bloga.",
  },
  teamPosts: {
    title: "Tim — profili",
    description: "Stranica /s/tim — kratke biografije.",
  },
  navLinks: {
    title: "Navigacioni linkovi",
    description: "Stavke iz headera i footera.",
  },
  siteStrings: {
    title: "Tekstovi sajta (hero, sekcije, header, footer)",
    description: "Sve etikete i opisi koji nisu vezani za pojedinačnu stranicu.",
  },
};

function newRun(total: number): RunState {
  return {
    inProgress: false,
    current: 0,
    total,
    currentLabel: "",
    done: 0,
    failed: 0,
    status: "idle",
  };
}

export function TranslateBatchPanel({ inventory }: Props) {
  const router = useRouter();
  const [missingOnly, setMissingOnly] = useState(false);
  const [selected, setSelected] = useState<Record<CategoryKey, boolean>>({
    cmsPages: true,
    blogPosts: true,
    teamPosts: true,
    navLinks: true,
    siteStrings: true,
  });

  // Active lists — full or missing-only
  const activeInventory = useMemo(() => {
    if (!missingOnly) return inventory;
    return {
      ...inventory,
      cmsPages: inventory.missing.cmsPages,
      blogPosts: inventory.missing.blogPosts,
      teamPosts: inventory.missing.teamPosts,
      navLinks: inventory.missing.navLinks,
      siteStrings: {
        ...inventory.siteStrings,
        totalWithContent: inventory.siteStrings.missingRu
          ? inventory.siteStrings.totalWithContent
          : 0,
      },
    };
  }, [missingOnly, inventory]);

  const totals = useMemo<Record<CategoryKey, number>>(
    () => ({
      cmsPages: activeInventory.cmsPages.length,
      blogPosts: activeInventory.blogPosts.length,
      teamPosts: activeInventory.teamPosts.length,
      navLinks: activeInventory.navLinks.length,
      siteStrings: activeInventory.siteStrings.totalWithContent > 0 ? 1 : 0,
    }),
    [activeInventory],
  );

  const [runs, setRuns] = useState<Record<CategoryKey, RunState>>(() => ({
    cmsPages: newRun(totals.cmsPages),
    blogPosts: newRun(totals.blogPosts),
    teamPosts: newRun(totals.teamPosts),
    navLinks: newRun(totals.navLinks),
    siteStrings: newRun(totals.siteStrings),
  }));

  useEffect(() => {
    setRuns({
      cmsPages: newRun(totals.cmsPages),
      blogPosts: newRun(totals.blogPosts),
      teamPosts: newRun(totals.teamPosts),
      navLinks: newRun(totals.navLinks),
      siteStrings: newRun(totals.siteStrings),
    });
  }, [totals]);

  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [translateReady, setTranslateReady] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    void getTranslateSetupStatusAction().then((s) => {
      setTranslateReady(s.ready);
      setSetupHint(s.ready ? null : s.hint);
      if (s.ready && s.provider) {
        setProviderLabel(
          s.provider === "openai" ? "OpenAI" : s.provider.toUpperCase(),
        );
      } else {
        setProviderLabel(null);
      }
    });
  }, []);

  function patchRun(key: CategoryKey, patch: Partial<RunState>) {
    setRuns((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function runCmsPages(): Promise<void> {
    const items = activeInventory.cmsPages;
    patchRun("cmsPages", {
      inProgress: true,
      status: "running",
      current: 0,
      done: 0,
      failed: 0,
      total: items.length,
    });
    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;
      const it = items[i]!;
      patchRun("cmsPages", { current: i + 1, currentLabel: it.label });
      const res = await translateAndSaveSitePageByIdAction(it.id);
      if (res.ok) {
        setRuns((p) => ({
          ...p,
          cmsPages: { ...p.cmsPages, done: p.cmsPages.done + 1 },
        }));
      } else {
        setRuns((p) => ({
          ...p,
          cmsPages: {
            ...p.cmsPages,
            failed: p.cmsPages.failed + 1,
            lastError: `${it.label}: ${res.error}`,
          },
        }));
      }
    }
    patchRun("cmsPages", { inProgress: false, status: "done", currentLabel: "" });
  }

  async function runPosts(key: "blogPosts" | "teamPosts"): Promise<void> {
    const items = activeInventory[key];
    patchRun(key, {
      inProgress: true,
      status: "running",
      current: 0,
      done: 0,
      failed: 0,
      total: items.length,
    });
    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;
      const it = items[i]!;
      patchRun(key, { current: i + 1, currentLabel: it.label });
      const res = await translateAndSavePostByIdAction(it.id);
      if (res.ok) {
        setRuns((p) => ({
          ...p,
          [key]: { ...p[key], done: p[key].done + 1 },
        }));
      } else {
        setRuns((p) => ({
          ...p,
          [key]: {
            ...p[key],
            failed: p[key].failed + 1,
            lastError: `${it.label}: ${res.error}`,
          },
        }));
      }
    }
    patchRun(key, { inProgress: false, status: "done", currentLabel: "" });
  }

  async function runNavLinks(): Promise<void> {
    const items = activeInventory.navLinks;
    patchRun("navLinks", {
      inProgress: true,
      status: "running",
      current: 0,
      done: 0,
      failed: 0,
      total: items.length,
    });
    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;
      const it = items[i]!;
      patchRun("navLinks", { current: i + 1, currentLabel: it.label });
      const res = await translateAndSaveNavLinkByIdAction(it.id);
      if (res.ok) {
        setRuns((p) => ({
          ...p,
          navLinks: { ...p.navLinks, done: p.navLinks.done + 1 },
        }));
      } else {
        setRuns((p) => ({
          ...p,
          navLinks: {
            ...p.navLinks,
            failed: p.navLinks.failed + 1,
            lastError: `${it.label}: ${res.error}`,
          },
        }));
      }
    }
    patchRun("navLinks", { inProgress: false, status: "done", currentLabel: "" });
  }

  async function runSiteStrings(): Promise<void> {
    patchRun("siteStrings", {
      inProgress: true,
      status: "running",
      current: 0,
      done: 0,
      failed: 0,
      total: 1,
      currentLabel: "Tekstovi sajta…",
    });
    const res = await translateAndSaveAllSiteStringsAction();
    if (res.ok) {
      patchRun("siteStrings", {
        inProgress: false,
        status: "done",
        current: 1,
        done: 1,
        currentLabel: "",
      });
    } else {
      patchRun("siteStrings", {
        inProgress: false,
        status: "done",
        current: 1,
        failed: 1,
        lastError: res.error,
        currentLabel: "",
      });
    }
  }

  async function runAllSelected(): Promise<void> {
    cancelRef.current = false;
    setBulkRunning(true);
    setBulkSummary(null);

    const tasks: { key: CategoryKey; run: () => Promise<void> }[] = [
      { key: "cmsPages", run: runCmsPages },
      { key: "blogPosts", run: () => runPosts("blogPosts") },
      { key: "teamPosts", run: () => runPosts("teamPosts") },
      { key: "navLinks", run: runNavLinks },
      { key: "siteStrings", run: runSiteStrings },
    ];

    for (const t of tasks) {
      if (cancelRef.current) break;
      if (!selected[t.key]) continue;
      if (totals[t.key] === 0) continue;
      await t.run();
    }

    let totalDone = 0;
    let totalFailed = 0;
    setRuns((prev) => {
      for (const k of Object.keys(prev) as CategoryKey[]) {
        if (!selected[k]) continue;
        totalDone += prev[k].done;
        totalFailed += prev[k].failed;
      }
      return prev;
    });

    setBulkSummary(
      totalFailed === 0
        ? `Završeno. Uspješno: ${totalDone}.`
        : `Završeno. Uspješno: ${totalDone}, neuspjelih: ${totalFailed}.`,
    );
    setBulkRunning(false);
    router.refresh();
  }

  function stopAll() {
    cancelRef.current = true;
  }

  const allDisabled = !translateReady || bulkRunning;
  const anySelected =
    selected.cmsPages ||
    selected.blogPosts ||
    selected.teamPosts ||
    selected.navLinks ||
    selected.siteStrings;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0e6dc] bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px]">
            <h2 className="font-serif text-xl font-semibold text-[#2a2118]">
              Mašinski prevod (ME → EN/RU)
            </h2>
            <p className="mt-1 text-sm text-[#6b5f54]">
              Označi kategorije i klikni „Prevedi sve označeno“. Prevod se
              snima direktno u bazu.
            </p>
            {providerLabel && (
              <p className="mt-2 text-xs text-[#8a7b6e]">
                Aktivan provajder: <strong>{providerLabel}</strong>
              </p>
            )}
            {setupHint && (
              <p className="mt-2 max-w-xl text-sm text-amber-800">
                {setupHint}
              </p>
            )}
            {/* Missing-only toggle */}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 select-none">
              <span
                role="switch"
                aria-checked={missingOnly}
                onClick={() => !bulkRunning && setMissingOnly((v) => !v)}
                className={[
                  "relative inline-block h-5 w-9 rounded-full transition-colors",
                  missingOnly ? "bg-[#f37021]" : "bg-zinc-300",
                  bulkRunning ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    missingOnly ? "translate-x-4" : "translate-x-0.5",
                  ].join(" ")}
                />
              </span>
              <span className="text-sm text-[#5c4f44]">
                Samo nedostajući prevodi
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={allDisabled || !anySelected}
              onClick={runAllSelected}
              className="inline-flex items-center gap-2 rounded-lg bg-[#f37021] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e0651c] disabled:opacity-50"
            >
              {bulkRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Languages className="h-4 w-4" aria-hidden />
              )}
              {bulkRunning ? "Prevodim…" : "Prevedi sve označeno"}
            </button>
            {bulkRunning ? (
              <button
                type="button"
                onClick={stopAll}
                className="rounded-lg border border-[#eadfce] bg-white px-4 py-2.5 text-sm font-medium text-[#5c4f44] hover:bg-[#fff9f5]"
              >
                Zaustavi
              </button>
            ) : null}
          </div>
        </div>
        {bulkSummary && (
          <p className="mt-4 rounded-lg bg-[#fff9f5] px-3 py-2 text-sm text-[#2a2118]">
            {bulkSummary}
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {(Object.keys(CATEGORY_META) as CategoryKey[]).map((key) => {
          const meta = CATEGORY_META[key];
          const total = totals[key];
          const run = runs[key];
          const pct =
            run.total === 0
              ? 0
              : Math.min(100, Math.round((run.current / run.total) * 100));

          const fullTotal =
            key === "siteStrings"
              ? (inventory.siteStrings.totalWithContent > 0 ? 1 : 0)
              : inventory[key].length;
          const detailCount =
            key === "siteStrings"
              ? `${inventory.siteStrings.totalWithContent} ključeva${missingOnly && !inventory.siteStrings.missingRu ? " · RU već postoji" : ""}`
              : missingOnly
                ? `${total} nedostaje / ${fullTotal} ukupno`
                : `${total} ${total === 1 ? "stavka" : "stavki"}`;

          return (
            <div
              key={key}
              className="rounded-2xl border border-[#f0e6dc] bg-white/90 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <label className="flex min-w-[260px] cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected[key]}
                    disabled={total === 0 || bulkRunning}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-[#d8c9b9] text-[#f37021] focus:ring-[#f37021]"
                  />
                  <span>
                    <span className="block font-semibold text-[#2a2118]">
                      {meta.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#6b5f54]">
                      {meta.description}
                    </span>
                    <span className="mt-1 block text-xs text-[#8a7b6e]">
                      {detailCount}
                    </span>
                  </span>
                </label>
                <div className="min-w-[220px] text-right text-sm">
                  {run.status === "idle" && total === 0 && (
                    <span className="text-xs text-[#8a7b6e]">nema sadržaja</span>
                  )}
                  {run.status === "running" && (
                    <span className="text-xs text-[#5c4f44]">
                      {run.current} / {run.total}
                    </span>
                  )}
                  {run.status === "done" && (
                    <span className="text-xs text-emerald-700">
                      Uspjelo: {run.done}
                      {run.failed > 0 ? ` · neuspjelih: ${run.failed}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#f5ece3]">
                <div
                  className={`h-full transition-all duration-300 ${
                    run.failed > 0 ? "bg-amber-500" : "bg-[#f37021]"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {run.currentLabel && run.status === "running" && (
                <p className="mt-2 truncate text-xs text-[#6b5f54]">
                  Trenutno: {run.currentLabel}
                </p>
              )}
              {run.lastError && (
                <p className="mt-2 text-xs text-red-700">{run.lastError}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
