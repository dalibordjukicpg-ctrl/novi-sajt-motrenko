import fs from "fs";

import { getBookingIntakeLabels } from "@/lib/booking/intake-labels";
import { generateBookingPdf } from "@/lib/pdf/generate-booking-pdf";
import type { Locale } from "@/lib/i18n";

function countPdfPages(buf: Buffer): number {
  const s = buf.toString("latin1");
  const kids = s.match(/\/Kids\s*\[[^\]]*\]/g);
  if (kids?.[0]) {
    const refs = kids[0].match(/\d+\s+\d+\s+R/g);
    if (refs) return refs.length;
  }
  const m = s.match(/\/Type\s*\/Page(?!s)/g);
  return m?.length ?? 0;
}

async function run(locale: Locale) {
  const labels = getBookingIntakeLabels(locale);
  const data = {
    locale,
    fullName:
      locale === "ru"
        ? "Иванова Анна"
        : locale === "en"
          ? "Jane Doe"
          : "Mira Čović",
    email: "test@test.com",
    phone: "+38267123456",
    dateOfBirth: "1990-05-12",
    whoAttends: "with_partner" as const,
    partnerFullName: "Partner Test",
    partnerPhone: "+38267999999",
    whatBroughtYou: `Tekst sa čćžšđ / Cyrillic test. ${"Lorem ipsum dolor. ".repeat(20)}`,
    tryingConceiveDuration: "6_12m" as const,
    consentAccepted: true,
  };

  const pdf = await generateBookingPdf(
    {
      submittedAt: new Date(),
      publicRef: "TEST1234",
      data,
      labels,
    },
    {
      clinicName: "Human Reproduction Center",
      clinicEmail: "info@humanreproduction.com",
      clinicWeb: "https://humanreproduction.com",
    },
  );

  const out = `scripts/output/prijavnica-${locale}.pdf`;
  fs.mkdirSync("scripts/output", { recursive: true });
  fs.writeFileSync(out, pdf);
  console.log(locale, "pages:", countPdfPages(pdf), "bytes:", pdf.length, out);
}

async function main() {
  for (const locale of ["me", "en", "ru"] as const) {
    await run(locale);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
