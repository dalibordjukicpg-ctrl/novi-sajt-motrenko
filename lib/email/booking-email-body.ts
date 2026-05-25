import type { BookingIntakeLabels } from "@/lib/booking/intake-labels";
import type { BookingRequestInput } from "@/lib/validations/booking-request";

export function buildBookingEmailBody(opts: {
  labels: BookingIntakeLabels;
  data: BookingRequestInput;
  publicRef: string;
}): { subject: string; text: string } {
  const { labels, data, publicRef } = opts;

  const who =
    labels.whoAttendsOptions[
      data.whoAttends as keyof typeof labels.whoAttendsOptions
    ];
  const ttc =
    data.tryingConceiveDuration &&
    labels.ttcOptions[
      data.tryingConceiveDuration as keyof typeof labels.ttcOptions
    ]
      ? labels.ttcOptions[
          data.tryingConceiveDuration as keyof typeof labels.ttcOptions
        ]
      : "—";

  const dob =
    data.dateOfBirth && data.dateOfBirth.length > 0 ? data.dateOfBirth : "—";
  const partnerName =
    data.whoAttends === "patient_only"
      ? "—"
      : (data.partnerFullName ?? "").trim() || "—";
  const partnerPhone =
    data.whoAttends === "patient_only"
      ? "—"
      : (data.partnerPhone ?? "").trim() || "—";

  const lines = [
    `${labels.formEyebrow} — ${labels.formTitle}`,
    `Ref / ID: ${publicRef}`,
    `---`,
    `${labels.fullName}: ${data.fullName}`,
    `${labels.email}: ${data.email}`,
    `${labels.phone}: ${data.phone}`,
    `Datum rođenja: ${dob}`,
    `${labels.whoAttends}: ${who}`,
    `${labels.partnerName}: ${partnerName}`,
    `${labels.partnerPhone}: ${partnerPhone}`,
    `${labels.whatBroughtYou}`,
    data.whatBroughtYou,
    `${labels.tryingConceive}: ${ttc}`,
    "",
    "Puni pregled je u prilogu (PDF, A4 — spreman za štampu).",
  ];

  const subject = `[Prijavnica] ${data.fullName}`;

  return { subject: subject.slice(0, 200), text: lines.join("\n") };
}
