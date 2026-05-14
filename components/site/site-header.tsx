import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import type { PublicNavItem } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/queries/site";
import type { SiteStringKey } from "@/lib/site-fields";

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  nav: PublicNavItem[];
  /** Logo iz admin biblioteke medija (opciono). */
  logoUrl?: string | null;
};

function NavDropdown({ item, locale }: { item: PublicNavItem; locale: Locale }) {
  if (item.children.length === 0) {
    return (
      <Link
        href={resolvePublicHref(locale, item.href)}
        className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
      >
        {item.label}
      </Link>
    );
  }
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
      >
        {item.label}
        <span className="text-xs text-slate-400 transition group-hover:rotate-180">▾</span>
      </button>
      <div className="invisible absolute left-0 top-full z-50 min-w-[240px] pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-xl border border-slate-100 bg-white py-2 shadow-lg">
          {item.children.map((ch) => (
            <Link
              key={ch.id}
              href={resolvePublicHref(locale, ch.href)}
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-900"
            >
              {ch.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ locale, s, nav, logoUrl }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href={`/${locale}`} className="group flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-auto max-w-[140px] object-contain"
            />
          ) : null}
          <div className="flex flex-col">
            <span className="font-serif text-lg font-semibold tracking-tight text-slate-900 transition group-hover:text-teal-800 md:text-xl">
              {s["org.brand"]}
            </span>
            <span className="text-xs text-slate-500">{s["org.subtitle"]}</span>
          </div>
        </Link>

        <nav className="hidden flex-wrap items-center gap-1 md:flex">
          {nav.map((item) => (
            <NavDropdown key={item.id} item={item} locale={locale} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            {locales.map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                className={`rounded-md px-2 py-1 text-xs font-medium uppercase ${
                  l === locale
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {l}
              </Link>
            ))}
          </div>
          <Link
            href={resolvePublicHref(locale, "#kontakt")}
            className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            {s["header.cta_book"]}
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2 md:hidden">
        <details className="rounded-lg border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800">
            Meni
          </summary>
          <div className="flex flex-col border-t border-slate-200 bg-white py-2">
            {nav.map((item) => (
              <div key={item.id} className="border-b border-slate-100 last:border-0">
                <Link
                  href={resolvePublicHref(locale, item.href)}
                  className="block px-4 py-2 text-sm font-medium text-slate-800"
                >
                  {item.label}
                </Link>
                {item.children.map((ch) => (
                  <Link
                    key={ch.id}
                    href={resolvePublicHref(locale, ch.href)}
                    className="block px-6 py-1.5 text-sm text-slate-600"
                  >
                    {ch.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
