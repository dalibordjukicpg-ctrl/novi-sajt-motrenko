import { DEFAULT_HEADER_LOGO } from "@/lib/clinic-assets";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  message: string;
  logoUrl: string | null;
  className?: string;
};

/**
 * Puna zamjena za `[locale]` layout kad je uključen maintenance u CMS-u.
 */
export function MaintenanceScreen({ title, message, logoUrl, className }: Props) {
  const logoSrc = logoUrl?.trim() || DEFAULT_HEADER_LOGO;

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
      style={{
        background:
          "linear-gradient(165deg, #fff9f5 0%, #fdf5ee 45%, #f5ebe3 100%)",
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          className="h-16 w-auto max-w-[220px] object-contain sm:h-20"
        />
        <div className="space-y-4">
          <h1
            className="text-2xl font-semibold leading-tight text-[#1a1208] sm:text-3xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {title}
          </h1>
          <p className="whitespace-pre-wrap text-base leading-relaxed text-[#4a3f36]">
            {message}
          </p>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#a08070]">
          Human Reproduction Center
        </p>
      </div>
    </div>
  );
}
