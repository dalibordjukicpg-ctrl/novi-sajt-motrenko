import type { Locale } from "@/lib/i18n";

const copy: Record<Locale, { hint: string; label: string }> = {
  me: {
    hint: "Prevucite mišem ili prstom da se osvrnete oko sebe. Strelicama se krećete kroz prostor.",
    label: "Virtuelna tura kroz ambulantu",
  },
  en: {
    hint: "Drag with your mouse or finger to look around. Use the arrows to move through the space.",
    label: "Virtual tour of the clinic",
  },
  ru: {
    hint: "Перетаскивайте мышью или пальцем, чтобы осмотреться. Стрелками перемещайтесь по помещению.",
    label: "Виртуальный тур по клинике",
  },
};

type Props = {
  embedUrl: string;
  locale: Locale;
  title?: string;
};

export function VirtualTourEmbed({ embedUrl, locale, title }: Props) {
  const t = copy[locale];

  return (
    <figure className="virtual-tour-embed my-8 w-full">
      <div className="overflow-hidden rounded-xl border border-[#f0e6dc] bg-white shadow-site-card">
        <iframe
          src={embedUrl}
          title={title?.trim() || t.label}
          loading="lazy"
          allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <figcaption className="mt-3 text-center text-xs text-zinc-500">
        {t.hint}
      </figcaption>
    </figure>
  );
}
