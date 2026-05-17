import Link from "next/link";

import { parseCompoundToken } from "@/lib/auth/parse-compound-token";

import { ResetPasswordForm } from "./reset-form";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw =
    typeof sp.token === "string"
      ? sp.token
      : Array.isArray(sp.token)
        ? sp.token[0]
        : "";
  const token = parseCompoundToken(raw) ? raw : null;

  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Nova lozinka</h1>
        {!token ? (
          <>
            <p className="mt-2 text-sm text-red-700">
              Neispravan ili nepotpun link. Zatražite novi reset.
            </p>
            <p className="mt-6">
              <Link
                href="/admin/forgot-password"
                className="text-sm text-neutral-700 underline-offset-2 hover:underline"
              >
                Zaboravljena lozinka
              </Link>
            </p>
          </>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </main>
  );
}
