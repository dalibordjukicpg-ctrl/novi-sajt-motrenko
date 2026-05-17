import { listAuditLogs } from "@/lib/queries/audit-logs-admin";
import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { redirect, unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditLogPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!hasPermission(session.role, PERMISSIONS.AUDIT_VIEW)) {
    unauthorized();
  }

  const sp = await searchParams;
  const actionRaw =
    typeof sp.action === "string"
      ? sp.action
      : Array.isArray(sp.action)
        ? sp.action[0]
        : "";

  const rows = await listAuditLogs({
    limit: 200,
    actionFilter: actionRaw || undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-[#2a2118]">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-[#6b5f54]">
          Nedavne sigurnosno-relevantne radnje (prijava, korisnici, reset lozinke
          …).
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[#f0e6dc] bg-white/90 p-4"
        method="get"
      >
        <div>
          <label className="text-xs font-medium text-[#6b5f54]">
            Filtar akcije
          </label>
          <input
            name="action"
            defaultValue={actionRaw}
            placeholder="npr. auth.login"
            className="mt-1 block w-64 rounded-lg border border-[#eadfce] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#2a2118] px-4 py-2 text-sm font-medium text-white"
        >
          Primijeni
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[#f0e6dc] bg-white text-sm">
        <table className="min-w-full divide-y divide-[#f0e6dc] text-left">
          <thead className="bg-[#fff9f5] text-xs uppercase text-[#8a7b6e]">
            <tr>
              <th className="px-3 py-2">Vrijeme</th>
              <th className="px-3 py-2">Akcija</th>
              <th className="px-3 py-2">Glumac</th>
              <th className="px-3 py-2">Subjekt</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e6dc]">
            {rows.map((r) => (
              <tr key={r.id} className="text-[#2a2118]">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[#6b5f54]">
                  {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-3 py-2 text-xs">
                  {r.actorUserId ?? "—"}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-xs">
                  {r.subjectType && r.subjectId
                    ? `${r.subjectType}:${r.subjectId}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-[#6b5f54]">
                  {r.ipAddress ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
