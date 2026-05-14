/** Javne admin rute (login) — bez provjere sesije (izbjegava Edge JWT u middlewareu). */
export default function AdminGuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
