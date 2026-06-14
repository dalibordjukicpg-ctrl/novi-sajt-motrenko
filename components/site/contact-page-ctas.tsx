import Link from "next/link";
import { Calendar, Phone } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { formatPhoneDisplay, telHrefMontenegro } from "@/lib/phone-format";
import { resolvePublicHref } from "@/lib/resolve-public-href";
import type { SiteStringKey } from "@/lib/site-fields";

type Props = {
  locale: Locale;
  s: Record<SiteStringKey, string>;
};

const LABELS: Record<
  Locale,
  { call: string; book: string; bookHint: string }
> = {
  me: {
    call: "Pozovite odmah",
    book: "Zakažite pregled",
    bookHint: "Online prijava ili poziv klinike",
  },
  en: {
    call: "Call now",
    book: "Book appointment",
    bookHint: "Online form or call the clinic",
  },
  ru: {
    call: "Позвонить",
    book: "Записаться на приём",
    bookHint: "Онлайн-форма или звонок в клинику",
  },
};

export function ContactPageCtas({ locale, s }: Props) {
  const labels = LABELS[locale];
  const phone1 = formatPhoneDisplay(s["contact.phone1"]);
  const phone2 = formatPhoneDisplay(s["contact.phone2"]);
  const tel1 = telHrefMontenegro(s["contact.phone1"]);
  const tel2 = telHrefMontenegro(s["contact.phone2"]);
  const bookHref = resolvePublicHref(locale, s["header.cta_book_href"] || "#kontakt-forma");

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2">
      {tel1 ? (
        <a
          href={tel1}
          className="group flex flex-col gap-2 rounded-xl border border-[#f0e6dc] bg-white px-4 py-4 shadow-sm transition hover:border-[#f37021]/40 hover:shadow-md"
        >
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f37021]">
            <Phone size={14} aria-hidden />
            {labels.call}
          </span>
          <span className="text-sm font-semibold text-neutral-900">{phone1}</span>
          {tel2 && phone2 !== phone1 ? (
            <span className="text-xs text-neutral-500">{phone2}</span>
          ) : null}
        </a>
      ) : null}

      <Link
        href={bookHref}
        className="group flex flex-col gap-2 rounded-xl border border-[#f37021]/25 bg-[#fff9f5] px-4 py-4 shadow-sm transition hover:border-[#f37021]/50 hover:shadow-md"
      >
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f37021]">
          <Calendar size={14} aria-hidden />
          {labels.book}
        </span>
        <span className="text-sm font-semibold text-neutral-900">{s["header.cta_book"]}</span>
        <span className="text-xs text-neutral-500">{labels.bookHint}</span>
      </Link>
    </div>
  );
}
