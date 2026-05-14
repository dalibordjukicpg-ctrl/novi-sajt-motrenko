import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Prijava za upravljačku ploču.
        </p>
        <LoginForm />
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
