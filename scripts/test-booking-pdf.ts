import fs from "fs";
import path from "path";

import { getBookingIntakeLabels } from "@/lib/booking/intake-labels";
import { generateBookingPdf } from "@/lib/pdf/generate-booking-pdf";

async function main() {
  const labels = getBookingIntakeLabels("me");
  const data = {
    locale: "me" as const,
    fullName: "Humana Rep",
    email: "test@test.com",
    phone: "+38267123456",
    dateOfBirth: "",
    whoAttends: "patient_only" as const,
    whatBroughtYou: "Test poruka sa čćžšđ slovima.",
    tryingConceiveDuration: "6_12m" as const,
    consentAccepted: true,
  };

  const pdf = await generateBookingPdf(
    { submittedAt: new Date(), publicRef: "C1314018", data, labels },
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
