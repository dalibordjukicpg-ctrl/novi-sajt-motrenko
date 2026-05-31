import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { adminPath } from "@/lib/admin-base-path";
import {
  DEFAULT_HEADER_LOGO,
  HEADER_LOGO_PIXEL_HEIGHT,
  HEADER_LOGO_PIXEL_WIDTH,
} from "@/lib/clinic-assets";
import { getActiveOtpChallenge } from "@/lib/auth/otp-challenge";
import { getSiteBranding } from "@/lib/queries/site-globals";

import { VerifyOtpForm } from "./verify-otp-form";

function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.ceil(seconds / 60);
  return `${m} min`;
}

export default async function AdminVerifyOtpPage() {
  const active = await getActiveOtpChallenge();

  if (!active.ok) {
    if (active.reason === "locked") {
      /* locked state — show page with message */
    } else {
      redirect(adminPath("login"));
    }
  }

  let logoSrc = DEFAULT_HEADER_LOGO;
  try {
    const b = await getSiteBranding();
    const u = b.logoUrl?.trim();
    if (u) logoSrc = u;
  } catch {
    /* ignore */
  }
  const logoRemote = /^https?:\/\//i.test(logoSrc);

  const lockedMessage =
    !active.ok && active.reason === "locked"
      ? `Verifikacija je privremeno zaključana. Pokušajte ponovo za ${formatRetryAfter(active.retryAfterSec ?? 0)}.`
      : null;

  return (
    <main className="relative min-h-dvh bg-site-canvas px-4 py-14 md:py-20">
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
            Verifikacija
          </h1>
          <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-site-muted">
            Poslali smo 6-cifreni kod na vašu email adresu. Unesite ga ispod
            da završite prijavu.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-site-border bg-white/95 p-8 shadow-site-card backdrop-blur-sm md:p-9">
          {lockedMessage ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
                {lockedMessage}
              </p>
              <p className="text-center text-sm">
                <Link
                  href={adminPath("login")}
                  className="font-medium text-site-brand-muted underline-offset-4 transition hover:text-site-brand hover:underline"
                >
                  Nazad na prijavu
                </Link>
              </p>
            </div>
          ) : (
            <VerifyOtpForm />
          )}
        </div>
      </div>
    </main>
  );
}
