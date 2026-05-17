import Link from "next/link";
import type { ReactNode } from "react";

export type PageHeroBreadcrumb = {
  label: string;
  href: string;
};

type Props = {
  children: ReactNode;
  /** Javna putanja ili pun URL pozadine (kao na motrenko PageHero). */
  backgroundImage?: string;
  max?: "7xl" | "5xl" | "4xl";
  /** Npr. Početna → O nama (sitno, narandžasto). */
  breadcrumbs?: PageHeroBreadcrumb[];
};

/**
 * Gornji blok unutrašnjih stranica — pozadina edge-to-edge, naslov u Playfair stilu.
 */
export function PageHero({
  children,
  backgroundImage = "/page-hero-panorama.png",
  max = "7xl",
  breadcrumbs,
}: Props) {
  const maxCls =
    max === "5xl" ? "max-w-5xl" : max === "4xl" ? "max-w-4xl" : "max-w-7xl";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10">
      <div
        className="relative isolate mx-auto w-full min-w-0 max-w-[1600px] overflow-hidden rounded-t-[1.35rem] rounded-b-3xl bg-site-surface-a pt-[4.5rem] shadow-site-lift ring-1 ring-black/[0.02] sm:rounded-t-[1.75rem] sm:pt-[5.25rem] sm:pb-12 md:pt-28 md:pb-14"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center 38%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Čitljivost: blijedi sloj lijevo (naslov + uvod), desno ostaje fotografija. */}
        <div
          className="pointer-events-none absolute inset-0 z-[6] bg-[linear-gradient(90deg,rgba(255,252,248,0.97)_0%,rgba(255,249,245,0.82)_30%,rgba(255,249,245,0.42)_48%,rgba(255,255,255,0)_74%)] max-sm:bg-[linear-gradient(90deg,rgba(255,252,248,0.98)_0%,rgba(255,249,245,0.9)_36%,rgba(255,255,255,0)_88%)]"
          aria-hidden
        />
        {/* Prelaz u krem pozadinu stranice (iznad bočnog sloja) */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[7] h-[38%] max-h-[220px] bg-gradient-to-b from-transparent to-site-canvas"
          aria-hidden
        />
        <div className={`relative z-10 mx-auto w-full ${maxCls} px-4 pb-12 pt-2 sm:px-6 sm:pb-14 lg:px-12`}>
          {breadcrumbs?.length ? (
            <nav
              aria-label="Putanja"
              className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-site-brand sm:mb-6 sm:text-[11px] sm:tracking-[0.26em]"
            >
              {breadcrumbs.map((c, i) => (
                <span key={`${c.href}-${c.label}`} className="flex items-center gap-2">
                  {i > 0 ? (
                    <span className="font-normal text-zinc-500" aria-hidden>
                      &gt;
                    </span>
                  ) : null}
                  <Link
                    href={c.href}
                    className="text-site-brand transition hover:text-site-brand-muted hover:underline"
                  >
                    {c.label}
                  </Link>
                </span>
              ))}
            </nav>
          ) : null}
          <div className="text-left">{children}</div>
        </div>
      </div>
    </div>
  );
}
