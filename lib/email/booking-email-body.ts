import type { BookingIntakeLabels } from "@/lib/booking/intake-labels";
import type { BookingRequestInput } from "@/lib/validations/booking-request";
import type { BookingAttachmentMeta } from "@/lib/validations/booking-attachments";

export function buildBookingEmailBody(opts: {
  labels: BookingIntakeLabels;
  data: BookingRequestInput;
  publicRef: string;
  attachments?: BookingAttachmentMeta[];
}): { subject: string; text: string } {
  const { labels, data, publicRef, attachments = [] } = opts;

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
    `${labels.pdfMetaReference}: ${publicRef}`,
    `---`,
    `${labels.fullName}: ${data.fullName}`,
    `${labels.email}: ${data.email}`,
    `${labels.phone}: ${data.phone}`,
    `${labels.pdfDateOfBirth}: ${dob}`,
    `${labels.whoAttends}: ${who}`,
    `${labels.partnerName}: ${partnerName}`,
    `${labels.partnerPhone}: ${partnerPhone}`,
    `${labels.whatBroughtYou}`,
    data.whatBroughtYou,
    `${labels.tryingConceive}: ${ttc}`,
    "",
    labels.pdfAttachmentNote,
  ];

  if (attachments.length > 0) {
    lines.push("");
    lines.push(labels.pdfAttachmentsNote);
    for (const a of attachments) {
      lines.push(`- ${a.filename} (${Math.round(a.size / 1024)} KB)`);
    }
  }

  const subject = `[${labels.formEyebrow}] ${data.fullName}`;

  return { subject: subject.slice(0, 200), text: lines.join("\n") };
}
