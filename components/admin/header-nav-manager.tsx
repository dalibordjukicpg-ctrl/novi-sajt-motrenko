"use client";

import Link from "next/link";

import {
  createNavLinkAction,
  deleteNavLinkAction,
  moveNavLinkOrderAction,
} from "@/app/admin/(authed)/site/actions";
import { AdminPanel } from "@/components/admin/admin-panel";
import {
  NavLinkRowForm,
  type PageOption,
} from "@/components/admin/nav-link-row-form";
import { adminPath } from "@/lib/admin-base-path";
import type { AdminNavRow } from "@/lib/queries/site";

function nextSortOrder(rows: AdminNavRow[]): number {
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((r) => r.sortOrder)) + 1;
}

function NavOrderButtons({ linkId }: { linkId: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <form action={moveNavLinkOrderAction}>
        <input type="hidden" name="linkId" value={linkId} />
        <input type="hidden" name="direction" value="up" />
        <button
          type="submit"
          title="Gore"
          className="rounded-md border border-[#eadfce] bg-white px-2 py-1 text-xs text-[#5c4f44] hover:bg-[#fff9f5]"
        >
          ↑
        </button>
      </form>
      <form action={moveNavLinkOrderAction}>
        <input type="hidden" name="linkId" value={linkId} />
        <input type="hidden" name="direction" value="down" />
        <button
          type="submit"
          title="Dole"
          className="rounded-md border border-[#eadfce] bg-white px-2 py-1 text-xs text-[#5c4f44] hover:bg-[#fff9f5]"
        >
          ↓
        </button>
      </form>
      <form
        action={deleteNavLinkAction}
        onSubmit={(e) => {
          if (
            !confirm(
              "Obrisati stavku i sve podstavke? Ovo se ne može poništiti.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="linkId" value={linkId} />
        <button
          type="submit"
          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800 hover:bg-red-100"
        >
          Obriši
        </button>
      </form>
    </div>
  );
}

function NewNavItemForm({
  placement,
  parentId,
  sortOrder,
  label,
  buttonLabel,
}: {
  placement: "header" | "footer";
  parentId?: string | null;
  sortOrder: number;
  label: string;
  buttonLabel: string;
}) {
  return (
    <form
      action={createNavLinkAction}
      className="rounded-xl border border-dashed border-[#e8d9ca] bg-[#fff9f5]/80 p-4"
    >
      <input type="hidden" name="placement" value={placement} />
      <input type="hidden" name="footerColumn" value="0" />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <p className="text-sm font-medium text-[#3d342c]">{label}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-[#6b5f54]">URL / sidro</span>
          <input
            name="href"
            defaultValue={parentId ? "/s/" : "#"}
            className="mt-1 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm"
          />
        </label>
        <input type="hidden" name="sortOrder" value={sortOrder} />
        <label className="text-sm">
          <span className="text-[#6b5f54]">Naziv (ME, ostalo uredi poslije)</span>
          <input
            name="defaultLabel"
            defaultValue={parentId ? "Podstavka" : "Kategorija"}
            className="mt-1 rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#f37021] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0651c]"
        >
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}

type Props = {
  rows: AdminNavRow[];
  pageOptions: PageOption[];
};

export function HeaderNavManager({ rows, pageOptions }: Props) {
  const headerRows = rows.filter((r) => r.placement === "header");
  const roots = headerRows
    .filter((r) => !r.parentId || !headerRows.some((h) => h.linkId === r.parentId))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const childrenOf = (parentId: string) =>
    headerRows
      .filter((r) => r.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-8">
      <AdminPanel
        title="Nova glavna kategorija"
        description="Kategorije su stavke u gornjem meniju (npr. O nama, Usluge). Podstavke dodajete ispod svake kategorije."
      >
        <NewNavItemForm
          placement="header"
          sortOrder={nextSortOrder(roots)}
          label="Dodaj kategoriju u header"
          buttonLabel="Nova kategorija"
        />
      </AdminPanel>

      {roots.length === 0 ? (
        <p className="text-sm text-[#6b5f54]">
          Još nema kategorija u headeru. Dodajte prvu iznad.
        </p>
      ) : (
        roots.map((root) => {
          const kids = childrenOf(root.linkId);
          const title = root.labels.me?.trim() || "Bez naziva";
          return (
            <AdminPanel
              key={root.linkId}
              title={title}
              description={`Redosled ${root.sortOrder} · ${root.visible ? "vidljivo" : "skriveno"}`}
              className="border-l-4 border-l-[#f37021]/70"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#c55a15]">
                  Glavna kategorija
                </p>
                <NavOrderButtons linkId={root.linkId} />
              </div>
              <NavLinkRowForm
                linkId={root.linkId}
                href={root.href}
                sortOrder={root.sortOrder}
                visible={root.visible}
                placement="header"
                footerColumn={0}
                labels={root.labels}
                pageOptions={pageOptions}
              />

              <div className="mt-8 space-y-4 border-t border-[#f0e6dc] pt-6">
                <p className="text-sm font-semibold text-[#3d342c]">
                  Podkategorije ({kids.length})
                </p>
                {kids.map((child) => (
                  <div
                    key={child.linkId}
                    className="rounded-xl border border-[#f0e6dc] bg-[#fff9f5]/60 p-4 pl-5 md:pl-6"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[#8a7b6e]">
                        ↳ {child.labels.me?.trim() || "Podstavka"}
                      </span>
                      <NavOrderButtons linkId={child.linkId} />
                    </div>
                    <NavLinkRowForm
                      linkId={child.linkId}
                      href={child.href}
                      sortOrder={child.sortOrder}
                      visible={child.visible}
                      placement="header"
                      footerColumn={0}
                      labels={child.labels}
                      pageOptions={pageOptions}
                    />
                  </div>
                ))}
                <NewNavItemForm
                  placement="header"
                  parentId={root.linkId}
                  sortOrder={nextSortOrder(kids)}
                  label="Nova podstavka u ovoj kategoriji"
                  buttonLabel="Dodaj podstavku"
                />
              </div>
            </AdminPanel>
          );
        })
      )}

      <p className="text-sm text-[#6b5f54]">
        Brend, kontakt i footer linkovi:{" "}
        <Link
          href={adminPath("content/header-footer")}
          className="font-medium text-[#c55a15] underline"
        >
          Footer i kontakt
        </Link>
        . CMS stranice:{" "}
        <Link href={adminPath("pages")} className="font-medium text-[#c55a15] underline">
          Stranice
        </Link>
        .
      </p>
    </div>
  );
}
