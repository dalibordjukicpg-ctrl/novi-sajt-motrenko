"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  ClipboardList,
  ImageIcon,
  Languages,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  Shield,
  Stethoscope,
} from "lucide-react";

import { logoutAction } from "@/app/admin/actions";
import { AdminActionBanner } from "@/components/admin/admin-action-banner";
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
  { href: adminPath("content/team/members"), label: "Profili članova" },
  { href: adminPath("content/team"), label: "Blok na početnoj" },
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
        "admin-nav-item",
        active && "admin-nav-item--active",
      )}
    >
      <span className="admin-nav-item__label">{label}</span>
      {active ? <span className="admin-nav-item__dot" aria-hidden /> : null}
    </Link>
  );
}

function NavSection({
  title,
  icon,
  tone = "warm",
  children,
}: {
  title: string;
  icon: ReactNode;
  tone?: "warm" | "cool" | "neutral";
  children: ReactNode;
}) {
  return (
    <section className={cn("admin-nav-section", `admin-nav-section--${tone}`)}>
      <header className="admin-nav-section__head">
        <span className="admin-nav-section__icon" aria-hidden>
          {icon}
        </span>
        <h2 className="admin-nav-section__title">{title}</h2>
      </header>
      <div className="admin-nav-section__body">{children}</div>
    </section>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === adminPath("pages")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === adminPath("content/header")) {
    return pathname === href;
  }
  if (href === adminPath()) {
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
  const showAdmin =
    navFlags.showUsers ||
    navFlags.showAudit ||
    navFlags.showAnalyticsCard ||
    navFlags.showBookings;
  const showSiteContent =
    navFlags.showGlobalSiteContent || navFlags.showPagesEntry;

  return (
    <>
      <div className="admin-sidebar-brand">
        <Link href={adminPath()} onClick={onNavigate} className="admin-sidebar-brand__link">
          <span className="admin-sidebar-brand__mark" aria-hidden>
            HRC
          </span>
          <span>
            <span className="admin-sidebar-brand__title">Admin panel</span>
            <span className="admin-sidebar-brand__sub">Human Reproduction Center</span>
          </span>
        </Link>
        <p className="admin-sidebar-brand__meta">Prezentacioni sajt · ME, EN, RU</p>
      </div>

      <nav className="admin-sidebar-nav">
        <NavSection title="Pregled" icon={<LayoutDashboard size={15} strokeWidth={2} />} tone="neutral">
          <NavItem
            href={adminPath()}
            label="Kontrolna tabla"
            active={isActive(pathname, adminPath())}
            onNavigate={onNavigate}
          />
        </NavSection>

        {showAdmin ? (
          <NavSection title="Administracija" icon={<Shield size={15} strokeWidth={2} />} tone="cool">
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
          </NavSection>
        ) : null}

        {showSiteContent ? (
          <NavSection
            title="Sadržaj sajta"
            icon={<LayoutTemplate size={15} strokeWidth={2} />}
            tone="warm"
          >
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
          </NavSection>
        ) : null}

        <NavSection title="Medicinski tim" icon={<Stethoscope size={15} strokeWidth={2} />} tone="warm">
          {TEAM_CONTENT.map((l) => (
            <NavItem
              key={l.href}
              href={l.href}
              label={l.label}
              active={isActive(pathname, l.href)}
              onNavigate={onNavigate}
            />
          ))}
        </NavSection>

        <NavSection title="Blog" icon={<BookOpen size={15} strokeWidth={2} />} tone="neutral">
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
        </NavSection>

        <NavSection title="Mediji" icon={<ImageIcon size={15} strokeWidth={2} />} tone="neutral">
          <NavItem
            href={adminPath("media")}
            label="Galerija i alt tekstovi"
            active={pathname.startsWith(adminPath("media"))}
            onNavigate={onNavigate}
          />
        </NavSection>

        {navFlags.showGlobalSiteContent ? (
          <NavSection title="Upitnik" icon={<ClipboardList size={15} strokeWidth={2} />} tone="warm">
            <NavItem
              href={adminPath("upitnik")}
              label="Upitnik za pacijente"
              active={pathname.startsWith(adminPath("upitnik"))}
              onNavigate={onNavigate}
            />
          </NavSection>
        ) : null}

        {navFlags.showGlobalSiteContent ? (
          <NavSection title="Prevodi" icon={<Languages size={15} strokeWidth={2} />} tone="cool">
            <NavItem
              href={adminPath("translate")}
              label="Mašinski prevod (ME → EN/RU)"
              active={pathname.startsWith(adminPath("translate"))}
              onNavigate={onNavigate}
            />
          </NavSection>
        ) : null}

        {navFlags.showSiteSettings ? (
          <NavSection title="Podešavanja" icon={<Settings size={15} strokeWidth={2} />} tone="cool">
            <NavItem
              href={adminPath("settings")}
              label="Sajt i skripte"
              active={pathname.startsWith(adminPath("settings"))}
              onNavigate={onNavigate}
            />
          </NavSection>
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
    <div className="flex min-h-dvh overflow-x-clip md:flex-row">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          aria-label="Zatvori meni"
          onClick={closeMenu}
        />
      ) : null}

      <aside
        className={cn(
          "admin-sidebar relative flex w-[17.5rem] max-w-[88vw] shrink-0 flex-col overflow-hidden",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out md:static md:z-auto md:max-w-none",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div aria-hidden className="admin-sidebar-embryo pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/site-backdrop.png"
            alt=""
            width={832}
            height={832}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
          <SidebarNav
            pathname={pathname}
            onNavigate={closeMenu}
            navFlags={navFlags}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-0">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="admin-topbar__menu-btn md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              Meni
            </button>
            <Link href={adminPath()} className="admin-topbar__title hidden md:inline">
              Kontrolna tabla
            </Link>
          </div>
          <div className="hidden min-w-0 flex-1 flex-col items-end text-right md:flex">
            <span className="max-w-[20rem] truncate text-xs font-medium text-[#5c4f44]">
              {userEmail}
            </span>
            <span className="text-[11px] text-[#8a7b6e]">
              {userRole.replace("_", " ")} · ME, EN, RU
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ClearSiteCacheButton />
            <form action={logoutAction}>
              <button type="submit" className="admin-topbar__logout">
                Odjavi se
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <AdminActionBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
