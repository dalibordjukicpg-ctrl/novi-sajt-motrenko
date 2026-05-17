import Link from "next/link";

import { LoginForm } from "./login-form";

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
    rawNext.startsWith("/admin") && !rawNext.startsWith("//")
      ? rawNext
      : "/admin";

  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Prijava za upravljačku ploču.
        </p>
        <p className="mt-3 rounded-lg border border-neutral-200/80 bg-white px-3 py-2 text-left text-xs leading-relaxed text-neutral-600">
          <span className="font-medium text-neutral-800">Lokalni URL: </span>
          dev server koristi port iz{" "}
          <code className="rounded bg-neutral-100 px-1">DEV_PORT</code> u .env
          (obično{" "}
          <a
            href="http://localhost:7392/admin/login"
            className="font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            :7392
          </a>
          ), ne podrazumijevani 3000.
        </p>
        <LoginForm redirectTo={redirectTo} />
        <p className="mt-4 text-center text-sm">
          <Link
            href="/admin/forgot-password"
            className="text-neutral-600 underline-offset-2 hover:underline"
          >
            Zaboravljena lozinka
          </Link>
        </p>
        <p className="mt-8 text-xs text-neutral-500">
          Prvi korisnik:{" "}
          <code className="rounded bg-neutral-200 px-1 py-0.5">
            npm run seed:admin
          </code>
        </p>
      </div>
    </main>
  );
}
