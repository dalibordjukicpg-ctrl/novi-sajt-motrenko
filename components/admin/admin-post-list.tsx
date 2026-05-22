import Link from "next/link";

import { adminPath } from "@/lib/admin-base-path";
import type { AdminPostRow } from "@/lib/queries/posts";

export function AdminPostList({
  rows,
  emptyMessage,
}: {
  rows: AdminPostRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-[#eadfce] bg-white px-4 py-8 text-center text-sm text-[#6b5f54]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#f0e6dc] rounded-xl border border-[#eadfce] bg-white shadow-sm">
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-[#2a2118]">
              {r.titleMe ?? "(bez naslova — me)"}
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#8a7b6e]">
              {r.slugMe ?? "—"} ·{" "}
              <span
                className={
                  r.published ? "text-emerald-700" : "text-amber-700"
                }
              >
                {r.published ? "objavljeno" : "nacrt"}
              </span>
            </p>
          </div>
          <Link
            href={adminPath(`posts/${r.id}/edit`)}
            className="shrink-0 rounded-md border border-[#eadfce] px-3 py-1.5 text-sm text-[#4a3f36] hover:bg-[#fff9f5]"
          >
            Uredi
          </Link>
        </li>
      ))}
    </ul>
  );
}
