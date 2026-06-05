import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "./login-form";
import { ADMIN_BASE_PATH, adminPath } from "@/lib/admin-base-path";
import {
  DEFAULT_HEADER_LOGO,
  HEADER_LOGO_PIXEL_HEIGHT,
  HEADER_LOGO_PIXEL_WIDTH,
} from "@/lib/clinic-assets";
import { getSiteBranding } from "@/lib/queries/site-globals";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rawNext =
    typeof sp.next === "string"
      ? sp.next
      : Array.isArray(sp.next)
        ? sp.next[0]
        : "";
  const redirectTo =
    rawNext.startsWith(`${ADMIN_BASE_PATH}/`) && !rawNext.startsWith("//")
      ? rawNext
      : ADMIN_BASE_PATH;

  let logoSrc = DEFAULT_HEADER_LOGO;
  try {
    const b = await getSiteBranding();
    const u = b.logoUrl?.trim();
    if (u) logoSrc = u;
  } catch {
    /* ignore */
  }
  const logoRemote = /^https?:\/\//i.test(logoSrc);

  return (
    <main className="relative min-h-dvh px-4 py-14 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src={logoSrc}
              alt="Human Reproduction Center"
              width={HEADER_LOGO_PIXEL_WIDTH}
              height={HEADER_LOGO_PIXEL_HEIGHT}
              priority
              unoptimized={logoRemote}
              className="h-14 w-auto max-h-[4rem] max-w-[min(100%,280px)] object-contain md:h-[4.25rem]"
            />
          </div>

          <p className="mt-8 font-header-nav text-[11px] font-semibold uppercase tracking-[0.22em] text-site-brand-muted">
            Administracija
          </p>
          <h1 className="mt-2 font-serif text-[1.65rem] font-semibold leading-snug tracking-tight text-site-ink md:text-[1.85rem]">
            Prijava
          </h1>
          <p className="mx-auto mt-2 max-w-[20rem] text-sm leading-relaxed text-site-muted">
            Siguran pristup upravljačkoj ploči.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-site-border bg-white/95 p-8 shadow-site-card backdrop-blur-sm md:p-9">
          <LoginForm redirectTo={redirectTo} />
          <p className="mt-6 text-center text-sm">
            <Link
              href={adminPath("forgot-password")}
              className="font-medium text-site-brand-muted underline-offset-4 transition hover:text-site-brand hover:underline"
            >
              Zaboravljena lozinka
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
