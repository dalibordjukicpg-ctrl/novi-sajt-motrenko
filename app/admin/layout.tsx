import { AdminBackdrop } from "@/components/admin/admin-backdrop";

/** Samo grupiranje ruta; shell za prijavljene je u `(authed)/layout.tsx` da login nije u klijentskom layoutu. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <AdminBackdrop />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
