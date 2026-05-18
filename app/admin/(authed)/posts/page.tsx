import Link from "next/link";

import { adminPath } from "@/lib/admin-base-path";
import { listPostsForAdmin } from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const rows = await listPostsForAdmin();

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Članci</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Svi zapisi. Klik za uređivanje.
            </p>
          </div>
          <Link
            href={adminPath("posts/new")}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Novi članak
          </Link>
        </div>

        <ul className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white shadow-sm">
          {rows.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-neutral-500">
              Još nema članaka.
            </li>
          ) : (
            rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">
                    {r.titleMe ?? "(bez naslova — me)"}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-neutral-500">
                    {r.slugMe ?? "—"} ·{" "}
                    <span className="text-neutral-600">
                      {r.contentRole === "team" ? "tim" : "blog"}
                    </span>{" "}
                    ·{" "}
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
                  className="shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
                >
                  Uredi
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}
