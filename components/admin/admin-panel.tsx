import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#2a2118]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6b5f54]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#f0e6dc] bg-white/90 p-6 shadow-[0_8px_32px_-20px_rgba(243,112,33,0.18)] backdrop-blur-sm",
        className,
      )}
    >
      {title ? (
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[#2a2118]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[#6b5f54]">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
