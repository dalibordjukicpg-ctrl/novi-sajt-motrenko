import Link from "next/link";

import { adminPath } from "@/lib/admin-base-path";
import {
  getSession,
  hasPermission,
  PERMISSIONS,
  type Permission,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALL_CARDS: {
  title: string;
  description: string;
  href: string;
  anyPermission?: Permission[];
}[] = [
  {
    title: "Header",
    description: "Glavne kategorije i podkategorije u gornjem meniju.",
    href: adminPath("content/header"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Stranice (CMS)",
    description: "Statičke stranice — /s/slug na sajtu.",
    href: adminPath("pages"),
    anyPermission: [
      PERMISSIONS.SITE_CONTENT_MANAGE,
      PERMISSIONS.ASSIGNED_CONTENT_MANAGE,
    ],
  },
  {
    title: "Hero baner",
    description: "Pozadina, naslovi i dugmad na početnoj.",
    href: adminPath("content/hero"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Footer i kontakt",
    description: "Tekstovi, kontakt i linkovi u podnožju.",
    href: adminPath("content/header-footer"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Početna — sekcije",
    description: "Statistike i naslovi sekcija.",
    href: adminPath("content/sections"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Blok „Upoznajte tim“ — tekstovi",
    description: "Tim na početnoj: tekstovi, kartice desno i fotografija.",
    href: adminPath("content/team"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Medicinski tim — profili",
    description: "Biografije doktora, embriologa i sestara (/s/tim).",
    href: adminPath("content/team/members"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Blog — novosti",
    description: "Novosti iz centra i nauke.",
    href: adminPath("posts"),
    anyPermission: [
      PERMISSIONS.SITE_CONTENT_MANAGE,
      PERMISSIONS.ASSIGNED_CONTENT_MANAGE,
    ],
  },
  {
    title: "Mediji",
    description: "Galerija i alt tekstovi.",
    href: adminPath("media"),
    anyPermission: [PERMISSIONS.MEDIA_MANAGE],
  },
  {
    title: "Prevodi (ME → EN/RU)",
    description:
      "Masovni mašinski prevod stranica, članaka, navigacije i tekstova sajta.",
    href: adminPath("translate"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Podešavanja",
    description: "Logo, favicon, analitika (SUPER_ADMIN za skripte).",
    href: adminPath("settings"),
    anyPermission: [PERMISSIONS.SITE_CONTENT_MANAGE],
  },
  {
    title: "Korisnici",
    description: "Uloge, aktivacija, pozivnice.",
    href: adminPath("users"),
    anyPermission: [PERMISSIONS.USERS_VIEW],
  },
  {
    title: "Audit",
    description: "Pregled audit zapisa.",
    href: adminPath("audit"),
    anyPermission: [PERMISSIONS.AUDIT_VIEW],
  },
  {
    title: "Analitika (pregled)",
    description: "Zarezervisano za izvještaje.",
    href: adminPath("analytics"),
    anyPermission: [PERMISSIONS.ANALYTICS_VIEW],
  },
];

export default async function AdminDashboardPage() {
  const session = await getSession();

  const cards = ALL_CARDS.filter((c) => {
    if (!c.anyPermission?.length) return true;
    return session
      ? c.anyPermission.some((p) => hasPermission(session.role, p))
      : false;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-[#2a2118]">
          Kontrolna tabla
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#6b5f54]">
          Sadržaj je organizovan po segmentima kao na javnom sajtu. Pristup
          karticama prati vašu ulogu (RBAC).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-[#f0e6dc] bg-white/90 p-5 shadow-[0_8px_32px_-20px_rgba(243,112,33,0.15)] backdrop-blur-sm transition hover:border-[#f37021]/40 hover:shadow-md"
          >
            <h2 className="font-semibold text-[#2a2118] group-hover:text-[#c55a15]">
              {c.title}
            </h2>
            <p className="mt-2 text-sm text-[#6b5f54]">{c.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-[#f37021]">
              Otvori →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
