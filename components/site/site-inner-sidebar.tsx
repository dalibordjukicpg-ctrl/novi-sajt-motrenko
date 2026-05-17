import Link from "next/link";
import { FileText, Info, Newspaper, Users, type LucideIcon } from "lucide-react";

import type { InnerPageSidebarItem } from "@/lib/site-page-inner-layout";

function isSidebarItemActive(item: InnerPageSidebarItem, activeSlug: string): boolean {
  const a = activeSlug.trim().toLowerCase();
  if (!a) return false;
  if (item.slug?.toLowerCase() === a) return true;
  const u = item.href.toLowerCase();
  if (u.includes(`/s/${a}`)) return true;
  const hashIdx = u.indexOf("#");
  if (hashIdx >= 0) {
    const frag = u.slice(hashIdx + 1).split("?")[0]!;
    if (frag === a) return true;
  }
  return false;
}

function iconForNavLabel(label: string): LucideIcon {
  const L = label.toLowerCase();
  if (L.includes("novost")) return Newspaper;
  if (L.includes("blog")) return Newspaper;
  if (L.includes("tim") || L.includes("ekip") || L.includes("osoblje")) return Users;
  if (
    L.includes("podaci") ||
    L.includes("inform") ||
    L.includes("opšt") ||
    L.includes("gener") ||
    L.includes("o nama")
  ) {
    return Info;
  }
  return FileText;
}

type Props = {
  sectionTitle: string;
  sectionHref: string;
  items: InnerPageSidebarItem[];
  activeSlug: string;
};

export function SiteInnerSidebar({
  sectionTitle,
  sectionHref,
  items,
  activeSlug,
}: Props) {
  return (
    <aside className="w-full shrink-0 lg:w-[min(100%,280px)]">
      <nav
        aria-label={sectionTitle}
        className="site-card-elevated-lg p-5 backdrop-blur-sm"
      >
        <Link
          href={sectionHref}
          className="mb-4 block font-serif text-[13px] font-normal uppercase tracking-[0.14em] text-site-brand"
        >
          {sectionTitle}
        </Link>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((item) => {
            const isActive = isSidebarItemActive(item, activeSlug);
            const Icon = iconForNavLabel(item.label);
            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] leading-snug transition-colors",
                    isActive
                      ? "bg-site-surface-b font-medium text-site-ink ring-1 ring-site-brand/20"
                      : "text-site-muted hover:bg-site-card hover:text-site-ink",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                      isActive
                        ? "border-site-brand/30 bg-site-card text-site-brand"
                        : "border-site-border bg-site-surface-c/80 text-site-subtle",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
