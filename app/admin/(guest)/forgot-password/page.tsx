import Link from "next/link";

import { adminPath } from "@/lib/admin-base-path";

import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-dvh px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Reset lozinke
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Unesite email; ako nalog postoji, stiže link za novu lozinku.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6">
          <Link
            href={adminPath("login")}
            className="text-sm text-neutral-600 underline-offset-2 hover:underline"
          >
            Nazad na prijavu
          </Link>
        </p>
      </div>
    </main>
  );
}
