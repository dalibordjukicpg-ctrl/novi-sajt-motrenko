import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import type { PublicNavItem } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/queries/site";
import type { SiteStringKey } from "@/lib/site-fields";

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
  nav: PublicNavItem[];
};

function flattenNav(items: PublicNavItem[]): { href: string; label: string }[] {
  const out: { href: string; label: string }[] = [];
  for (const i of items) {
    out.push({ href: i.href, label: i.label });
    for (const ch of i.children) {
      out.push({ href: ch.href, label: ch.label });
    }
  }
  return out;
}

export function SiteFooter({ locale, s, nav }: Props) {
  const flat = flattenNav(nav);
  return (
    <footer id="kontakt" className="border-t border-slate-800 bg-slate-950 text-slate-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:px-6 lg:grid-cols-4">
        <div>
          <p className="font-serif text-lg font-semibold text-white">{s["org.brand"]}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{s["footer.tagline"]}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {(s["social.facebook"] ?? "").startsWith("http") && (
              <a
                href={s["social.facebook"]}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white"
              >
                Facebook
              </a>
            )}
            {(s["social.instagram"] ?? "").startsWith("http") && (
              <a
                href={s["social.instagram"]}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white"
              >
                Instagram
              </a>
            )}
            {(s["social.linkedin"] ?? "").startsWith("http") && (
              <a
                href={s["social.linkedin"]}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400/90">
            {s["footer.nav_title"]}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {flat.map((l) => (
              <li key={`${l.href}-${l.label}`}>
                <Link
                  href={resolvePublicHref(locale, l.href)}
                  className="text-slate-400 hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400/90">
            {s["footer.hours_title"]}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>
              <span className="text-slate-300">Pn–Pt</span> — {s["hours.mon_fri"]}
            </li>
            <li>
              <span className="text-slate-300">Ut</span> — {s["hours.tuesday"]}
            </li>
            <li>
              <span className="text-slate-300">Sub</span> — {s["hours.sat"]}
            </li>
            <li>
              <span className="text-slate-300">Ned</span> — {s["hours.sun"]}
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400/90">
            Kontakt
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>
              <a
                href={`tel:${(s["contact.phone1"] ?? "").replace(/\s/g, "")}`}
                className="hover:text-white"
              >
                {s["contact.phone1"]}
              </a>
            </li>
            <li>
              <a
                href={`tel:${(s["contact.phone2"] ?? "").replace(/\s/g, "")}`}
                className="hover:text-white"
              >
                {s["contact.phone2"]}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${s["contact.email"] ?? ""}`}
                className="hover:text-white"
              >
                {s["contact.email"]}
              </a>
            </li>
            <li className="pt-1 leading-relaxed">{s["contact.address"]}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center text-xs text-slate-500 md:flex-row md:px-6 md:text-left">
          <p>© {new Date().getFullYear()} {s["org.brand"]}</p>
          <Link href="/admin/login" className="text-slate-600 hover:text-slate-400">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
