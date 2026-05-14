"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const CONTENT_LINKS = [
  { href: "/admin/content/header-footer", label: "Header i footer" },
  { href: "/admin/content/hero", label: "Hero / baner" },
  { href: "/admin/content/sections", label: "Sekcije početne" },
] as const;

function NavItem({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-neutral-900 font-medium text-white"
          : "text-neutral-700 hover:bg-neutral-100",
      )}
    >
      {label}
    </Link>
  );
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="border-b border-neutral-100 px-4 py-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="font-serif text-lg font-semibold text-neutral-900"
        >
          Admin
        </Link>
        <p className="mt-1 text-xs text-neutral-500">
          Prezentacioni sajt · 4 jezika
        </p>
      </div>
      <nav className="max-h-[calc(100dvh-8rem)] flex-1 space-y-6 overflow-y-auto p-4 text-sm md:max-h-none">
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Sadržaj stranica
          </p>
          <div className="space-y-1">
            {CONTENT_LINKS.map((l) => (
              <NavItem
                key={l.href}
                href={l.href}
                label={l.label}
                active={pathname === l.href}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Blog
          </p>
          <div className="space-y-1">
            <NavItem
              href="/admin/posts"
              label="Lista članaka"
              active={
                pathname.startsWith("/admin/posts") &&
                !pathname.startsWith("/admin/posts/new")
              }
              onNavigate={onNavigate}
            />
            <NavItem
              href="/admin/posts/new"
              label="Novi članak"
              active={pathname === "/admin/posts/new"}
              onNavigate={onNavigate}
            />
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Mediji
          </p>
          <NavItem
            href="/admin/media"
            label="Galerija i alt tekstovi"
            active={pathname.startsWith("/admin/media")}
            onNavigate={onNavigate}
          />
        </div>
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Podešavanja
          </p>
          <NavItem
            href="/admin/settings"
            label="Sajt i skripte"
            active={pathname.startsWith("/admin/settings")}
            onNavigate={onNavigate}
          />
        </div>
      </nav>
    </>
  );
}

export function AdminDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-dvh bg-neutral-100 md:flex-row">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Zatvori meni"
          onClick={closeMenu}
        />
      ) : null}

      <aside
        className={cn(
          "flex w-64 max-w-[85vw] shrink-0 flex-col border-neutral-200 bg-white",
          "fixed inset-y-0 left-0 z-50 border-r shadow-lg transition-transform duration-200 md:static md:z-auto md:max-w-none md:shadow-none",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <SidebarNav pathname={pathname} onNavigate={closeMenu} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-0">
        <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              Meni
            </button>
            <Link
              href="/admin"
              className="hidden font-semibold text-neutral-900 md:inline"
            >
              Kontrolna tabla
            </Link>
          </div>
          <div className="hidden text-sm text-neutral-500 md:block">
            Upravljanje sadržajem na crnogorskom, engleskom, ruskom i turskom.
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Odjavi se
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
