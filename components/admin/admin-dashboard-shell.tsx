"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAction } from "@/app/admin/actions";
import { ClearSiteCacheButton } from "@/components/admin/clear-site-cache-button";
import { adminPath } from "@/lib/admin-base-path";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const SITE_CONTENT = [
  { href: adminPath("content/header"), label: "Header" },
  { href: adminPath("content/header-footer"), label: "Footer i kontakt" },
  { href: adminPath("pages"), label: "Stranice (CMS)" },
  { href: adminPath("content/hero"), label: "Hero baner" },
  { href: adminPath("content/sections"), label: "Početna — sekcije" },
  { href: adminPath("content/home-cards"), label: "Kartice usluga" },
] as const;

const TEAM_CONTENT = [
  {
    href: adminPath("content/team/members"),
    label: "Profili članova",
  },
  {
    href: adminPath("content/team"),
    label: "Blok na početnoj",
  },
] as const;

export type AdminShellNavFlags = {
  showUsers: boolean;
  showAudit: boolean;
  showAnalyticsCard: boolean;
  showBookings: boolean;
  allowCreatePost: boolean;
  allowCreatePage: boolean;
  showGlobalSiteContent: boolean;
  showPagesEntry: boolean;
  showSiteSettings: boolean;
};

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
        "block rounded-lg px-3 py-2 text-sm leading-snug transition",
        active
          ? "bg-[#f37021] font-medium text-white shadow-sm"
          : "text-[#4a3f36] hover:bg-[#fff0e6]",
      )}
    >
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === adminPath("pages")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === adminPath("content/header")) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  onNavigate,
  navFlags,
}: {
  pathname: string;
  onNavigate?: () => void;
  navFlags: AdminShellNavFlags;
}) {
  return (
    <>
      <div className="border-b border-[#eadfce]/70 px-4 py-5">
        <Link
          href={adminPath()}
          onClick={onNavigate}
          className="font-serif text-lg font-semibold text-[#2a2118]"
        >
          HRC Admin
        </Link>
        <p className="mt-1 text-xs text-[#8a7b6e]">
          Prezentacioni sajt · 4 jezika
        </p>
      </div>
      <nav className="max-h-[calc(100dvh-9rem)] flex-1 space-y-6 overflow-y-auto p-4 text-sm md:max-h-none">
        {(navFlags.showUsers ||
          navFlags.showAudit ||
          navFlags.showAnalyticsCard ||
          navFlags.showBookings) && (
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#c55a15]/80">
              Administracija
            </p>
            <div className="space-y-1">
              {navFlags.showUsers ? (
                <NavItem
                  href={adminPath("users")}
                  label="Korisnici i uloge"
                  active={pathname.startsWith(adminPath("users"))}
                  onNavigate={onNavigate}
                />
              ) : null}
              {navFlags.showAudit ? (
                <NavItem
                  href={adminPath("audit")}
                  label="Audit log"
                  active={pathname.startsWith(adminPath("audit"))}
                  onNavigate={onNavigate}
                />
              ) : null}
              {navFlags.showAnalyticsCard ? (
                <NavItem
                  href={adminPath("analytics")}
                  label="Analitika"
                  active={pathname.startsWith(adminPath("analytics"))}
                  onNavigate={onNavigate}
                />
              ) : null}
              {navFlags.showBookings ? (
                <NavItem
                  href={adminPath("bookings")}
                  label="Zahtjevi za termin"
                  active={pathname.startsWith(adminPath("bookings"))}
                  onNavigate={onNavigate}
                />
              ) : null}
            </div>
          </div>
        )}
        {(navFlags.showGlobalSiteContent || navFlags.showPagesEntry) && (
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#c55a15]/80">
            Sadržaj sajta
          </p>
          <div className="space-y-1">
            {navFlags.showGlobalSiteContent
              ? SITE_CONTENT.map((l) => (
                  <NavItem
                    key={l.href}
                    href={l.href}
                    label={l.label}
                    active={isActive(pathname, l.href)}
                    onNavigate={onNavigate}
                  />
                ))
              : null}
            {navFlags.showPagesEntry && !navFlags.showGlobalSiteContent ? (
              <NavItem
                href={adminPath("pages")}
                label="Stranice (CMS)"
                active={isActive(pathname, adminPath("pages"))}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        </div>
        )}
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#c55a15]/80">
            Medicinski tim
          </p>
          <div className="space-y-1">
            {TEAM_CONTENT.map((l) => (
              <NavItem
                key={l.href}
                href={l.href}
                label={l.label}
                active={isActive(pathname, l.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#c55a15]/80">
            Blog
          </p>
          <div className="space-y-1">
            <NavItem
              href={adminPath("posts")}
              label="Novosti — lista članaka"
              active={pathname === adminPath("posts")}
              onNavigate={onNavigate}
            />
            {navFlags.allowCreatePost ? (
              <NavItem
                href={adminPath("posts/new")}
                label="Novi članak"
                active={pathname === adminPath("posts/new")}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#c55a15]/80">
            Mediji
          </p>
          <NavItem
            href={adminPath("media")}
            label="Galerija i alt tekstovi"
            active={pathname.startsWith(adminPath("media"))}
            onNavigate={onNavigate}
          />
        </div>
        {navFlags.showGlobalSiteContent ? (
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#c55a15]/80">
              Prevodi
            </p>
            <NavItem
              href={adminPath("translate")}
              label="Mašinski prevod (ME → EN/RU)"
              active={pathname.startsWith(adminPath("translate"))}
              onNavigate={onNavigate}
            />
          </div>
        ) : null}
        {navFlags.showSiteSettings ? (
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#c55a15]/80">
            Podešavanja
          </p>
          <NavItem
            href={adminPath("settings")}
            label="Sajt i skripte"
            active={pathname.startsWith(adminPath("settings"))}
            onNavigate={onNavigate}
          />
        </div>
        ) : null}
      </nav>
    </>
  );
}

export function AdminDashboardShell({
  children,
  userEmail,
  userRole,
  navFlags,
}: {
  children: React.ReactNode;
  userEmail: string;
  userRole: UserRole;
  navFlags: AdminShellNavFlags;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className="flex min-h-dvh overflow-x-clip md:flex-row"
      style={{
        background:
          "linear-gradient(160deg, #fff9f5 0%, #fdf4ed 48%, #f8ebe0 100%)",
      }}
    >
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
          "flex w-64 max-w-[85vw] shrink-0 flex-col border-[#eadfce]/80 bg-[#fff9f5]",
          "fixed inset-y-0 left-0 z-50 border-r shadow-lg transition-transform duration-200 md:static md:z-auto md:max-w-none md:shadow-none",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <SidebarNav
          pathname={pathname}
          onNavigate={closeMenu}
          navFlags={navFlags}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-0">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-[#fff9f5] px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#eadfce] bg-white px-3 py-1.5 text-sm font-medium text-[#4a3f36] md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              Meni
            </button>
            <Link
              href={adminPath()}
              className="hidden font-semibold text-[#2a2118] md:inline"
            >
              Kontrolna tabla
            </Link>
          </div>
          <div className="hidden min-w-0 flex-1 flex-col items-end text-right md:flex">
            <span className="max-w-[20rem] truncate text-xs text-[#6b5f54]">
              {userEmail} · {userRole.replace("_", " ")}
            </span>
            <span className="text-[11px] text-[#8a7b6e]">
              Upravljanje sadržajem · ME, EN, RU, TR
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ClearSiteCacheButton />
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-[#eadfce] bg-white px-3 py-1.5 text-sm text-[#5c4f44] hover:bg-[#fff9f5]"
              >
                Odjavi se
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
