import Link from "next/link";

const CARDS: { title: string; description: string; href: string }[] = [
  {
    title: "Header i footer",
    description: "Tekstovi, kontakt, društvene mreže i navigacija.",
    href: "/admin/content/header-footer",
  },
  {
    title: "Hero / baner",
    description: "Naslovi, CTA i pozadinska slika.",
    href: "/admin/content/hero",
  },
  {
    title: "Sekcije početne",
    description: "Statistike i naslovi sekcija.",
    href: "/admin/content/sections",
  },
  {
    title: "Blog",
    description: "Lista i uređivanje članaka na 4 jezika.",
    href: "/admin/posts",
  },
  {
    title: "Mediji",
    description: "Galerija i alt tekstovi (MNE · EN · RU · TR).",
    href: "/admin/media",
  },
  {
    title: "Podešavanja",
    description: "Logo, favicon, analitika, Resend status.",
    href: "/admin/settings",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-neutral-900">
          Kontrolna tabla
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Sadržaj je grupisan kao na javnom sajtu; jezici se mijenjaju karticama
          unutar iste forme (MNE · EN · RU · TR), bez skakanja po odvojenim
          stranicama.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <h2 className="font-semibold text-neutral-900 group-hover:text-teal-900">
              {c.title}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">{c.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-teal-800">
              Otvori →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
