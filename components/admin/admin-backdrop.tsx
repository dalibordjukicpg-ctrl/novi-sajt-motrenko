/**
 * Pozadina admina — isti embrion kao na javnom sajtu, ali slabiji u glavnoj zoni.
 * Jači sloj u bočnom meniju dodaje AdminDashboardShell.
 */
export function AdminBackdrop() {
  return (
    <div
      aria-hidden
      className="admin-backdrop pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #fff9f5 0%, #fdf4ed 48%, #f8ebe0 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 70% at 72% 22%, rgba(251,231,216,0.28) 0%, rgba(255,248,242,0.12) 45%, transparent 72%)",
        }}
      />
      <div
        className="absolute"
        style={{
          top: "-6%",
          right: "-8%",
          width: "min(62vw, 46rem)",
          height: "min(62vw, 46rem)",
          borderRadius: "48% 52% 44% 56% / 50% 46% 54% 50%",
          background:
            "radial-gradient(ellipse 68% 68% at 55% 46%, rgba(242,192,140,0.36) 0%, rgba(232,104,42,0.1) 48%, transparent 72%)",
          filter: "blur(52px)",
          opacity: 0.55,
        }}
      />
      <div
        className="absolute max-md:opacity-80"
        style={{
          top: "-2%",
          right: "-6%",
          width: "min(58vw, 42rem)",
          height: "min(58vw, 42rem)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/site-backdrop.png"
          alt=""
          width={832}
          height={832}
          className="h-full w-full object-contain object-right-top opacity-[0.26] mix-blend-multiply md:opacity-[0.28]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div
        className="absolute inset-0 opacity-[0.018] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}
