"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";

import { adminPath } from "@/lib/admin-base-path";
import type { UserRole } from "@/lib/db/schema";
import type { AdminUserRow } from "@/lib/queries/admin-users";

import {
  createUserAction,
  deleteUserAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "./actions";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"];

function roleLabel(r: UserRole): string {
  return r.replace("_", " ");
}

export function UsersAdminTable({
  initialRows,
  actorRole,
  canCreate,
  canRoles,
  canDeactivate,
}: {
  initialRows: AdminUserRow[];
  actorRole: UserRole;
  canCreate: boolean;
  canRoles: boolean;
  canDeactivate: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? "all";
  const active = searchParams.get("active") ?? "";

  const [createState, createAction, createPending] = useActionState(
    createUserAction,
    {},
  );

  const [, startTransition] = useTransition();

  useEffect(() => {
    if (createState.ok) router.refresh();
  }, [createState.ok, router]);

  function applyFilters(next: { q?: string; role?: string; active?: string }) {
    const p = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) p.set("q", next.q);
      else p.delete("q");
    }
    if (next.role !== undefined) {
      if (next.role && next.role !== "all") p.set("role", next.role);
      else p.delete("role");
    }
    if (next.active !== undefined) {
      if (next.active === "1") p.set("active", "1");
      else p.delete("active");
    }
    router.push(`${adminPath("users")}?${p.toString()}`);
  }

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[#f0e6dc] bg-white/90 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          applyFilters({
            q: String(fd.get("q") ?? ""),
            role: String(fd.get("role") ?? "all"),
            active: fd.get("active") === "on" ? "1" : "",
          });
        }}
      >
        <div>
          <label className="text-xs font-medium text-[#6b5f54]">Pretraga</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="email"
            className="mt-1 block w-56 rounded-lg border border-[#eadfce] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[#6b5f54]">Uloga</label>
          <select
            name="role"
            defaultValue={role}
            className="mt-1 block rounded-lg border border-[#eadfce] px-3 py-2 text-sm"
          >
            <option value="all">Sve</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#4a3f36]">
          <input type="checkbox" name="active" defaultChecked={active === "1"} />
          Samo aktivni
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#2a2118] px-4 py-2 text-sm font-medium text-white"
        >
          Primijeni
        </button>
        <Link
          href={adminPath("users")}
          className="text-sm text-[#c55a15] underline-offset-2 hover:underline"
        >
          Reset
        </Link>
      </form>

      {canCreate ? (
        <section className="rounded-xl border border-[#f0e6dc] bg-white/90 p-5">
          <h2 className="text-sm font-semibold text-[#2a2118]">
            Novi korisnik
          </h2>
          <form action={createAction} className="mt-4 flex flex-wrap gap-3">
            <input
              name="email"
              type="email"
              required
              placeholder="email"
              className="rounded-lg border border-[#eadfce] px-3 py-2 text-sm"
            />
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="lozinka (min 8)"
              className="rounded-lg border border-[#eadfce] px-3 py-2 text-sm"
            />
            <select
              name="role"
              defaultValue="USER"
              className="rounded-lg border border-[#eadfce] px-3 py-2 text-sm"
            >
              {(actorRole === "SUPER_ADMIN"
                ? ROLES
                : (["ADMIN", "STAFF", "USER"] as UserRole[])
              ).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createPending}
              className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {createPending ? "…" : "Kreiraj"}
            </button>
          </form>
          {createState.error ? (
            <p className="mt-2 text-sm text-red-700">{createState.error}</p>
          ) : null}
          {createState.ok ? (
            <p className="mt-2 text-sm text-green-700">Korisnik kreiran.</p>
          ) : null}
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#f0e6dc] bg-white">
        <table className="min-w-full divide-y divide-[#f0e6dc] text-sm">
          <thead className="bg-[#fff9f5] text-left text-xs uppercase text-[#8a7b6e]">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Uloga</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verifikacija</th>
              <th className="px-4 py-3">Zadnja prijava</th>
              <th className="px-4 py-3">Akcije</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e6dc] text-[#2a2118]">
            {initialRows.map((u) => (
              <tr key={u.id}>
                <td className="whitespace-nowrap px-4 py-2 font-medium">
                  {u.email}
                </td>
                <td className="px-4 py-2">
                  {canRoles ? (
                    <form
                      action={(fd) => {
                        startTransition(async () => {
                          await updateUserRoleAction(fd);
                          router.refresh();
                        });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded border border-[#eadfce] px-2 py-1 text-xs"
                        disabled={
                          actorRole !== "SUPER_ADMIN" && u.role === "SUPER_ADMIN"
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded border border-[#eadfce] bg-white px-2 py-1 text-xs"
                      >
                        Sačuvaj
                      </button>
                    </form>
                  ) : (
                    <span>{roleLabel(u.role)}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {u.isActive ? (
                    <span className="text-green-700">Aktivan</span>
                  ) : (
                    <span className="text-red-700">Neaktivan</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-[#6b5f54]">
                  {u.emailVerifiedAt
                    ? u.emailVerifiedAt.toISOString().slice(0, 10)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-[#6b5f54]">
                  {u.lastLoginAt
                    ? u.lastLoginAt.toLocaleString()
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col gap-2">
                    {canDeactivate ? (
                      <form
                        action={(fd) => {
                          startTransition(async () => {
                            await setUserActiveAction(fd);
                            router.refresh();
                          });
                        }}
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={u.isActive ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          className="rounded border border-[#eadfce] bg-white px-2 py-1 text-xs"
                        >
                          {u.isActive ? "Deaktiviraj" : "Aktiviraj"}
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-[#8a7b6e]">—</span>
                    )}
                    {canCreate ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (
                            !window.confirm(
                              "Trajno uklanjate korisnika iz baze?",
                            )
                          ) {
                            return;
                          }
                          const fd = new FormData(e.currentTarget);
                          startTransition(async () => {
                            await deleteUserAction(fd);
                            router.refresh();
                          });
                        }}
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-700 underline-offset-2 hover:underline"
                        >
                          Obriši
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
