/** Samo grupiranje ruta; shell za prijavljene je u `(authed)/layout.tsx` da login nije u klijentskom layoutu. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
