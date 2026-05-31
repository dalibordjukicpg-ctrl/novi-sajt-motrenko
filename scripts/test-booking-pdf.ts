import fs from "fs";
import path from "path";

import { getBookingStaffDocumentLabels } from "@/lib/booking/intake-labels";
import { generateBookingPdf } from "@/lib/pdf/generate-booking-pdf";

async function main() {
  const labels = getBookingStaffDocumentLabels();
  const data = {
    locale: "me" as const,
    fullName: "humana",
    email: "humana.pg@gmail.com",
    phone: "566565655",
    dateOfBirth: "",
    whoAttends: "patient_only" as const,
    whatBroughtYou: "hgdhdgdfgdfgdfg",
    tryingConceiveDuration: "lt_6m" as const,
    consentAccepted: true,
  };

  const pdf = await generateBookingPdf(
    {
      submittedAt: new Date(),
      publicRef: "94CB00CA",
      data,
      labels,
      attachments: [{ id: "a1", filename: "159.pdf", size: 120_000, storageKey: "x" }],
    },
    {
      clinicName: "Human Reproduction Center",
      clinicEmail: "info@humanreproduction.com",
      clinicWeb: "https://humanreproduction.com",
    },
  );

  const out = path.join(process.cwd(), "scripts/output/prijavnica-layout-test.pdf");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, pdf);
  console.log("[test:booking-pdf]", out, pdf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
