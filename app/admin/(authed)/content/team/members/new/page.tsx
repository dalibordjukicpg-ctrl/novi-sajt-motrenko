import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateTeamMemberForm } from "@/components/forms/create-team-member-form";
import { adminPath } from "@/lib/admin-base-path";
import type { TeamRole } from "@/lib/db/schema";
import { listMediaOptions } from "@/lib/queries/media-admin";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<TeamRole, string> = {
  doctor: "Doktor",
  embryologist: "Klinički embriolog",
  nurse: "Medicinska sestra / tehničar",
};

function parseTeamRole(raw: string | string[] | undefined): TeamRole {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "doctor" || value === "embryologist" || value === "nurse") {
    return value;
  }
  return "doctor";
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminNewTeamMemberPage({ searchParams }: Props) {
  const sp = await searchParams;
  const role = parseTeamRole(sp.role);
  if (!sp.role) {
    redirect(adminPath("content/team/members/new?role=doctor"));
  }

  const mediaOptions = await listMediaOptions();

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-3xl pb-6">
        <Link
          href={adminPath("content/team/members")}
          className="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          ← Medicinski tim
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
          Novi član tima
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Kategorija: {ROLE_LABELS[role]}. Unesite ime, sliku i biografiju (ME
          obavezno; EN/RU opciono).
        </p>
      </div>
      <CreateTeamMemberForm
        mediaOptions={mediaOptions}
        initialTeamRole={role}
      />
    </main>
  );
}
