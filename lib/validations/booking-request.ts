import { z } from "zod";

/** Jezici prihvaćeni u javnoj formi za termin (usklađeno sa `locale` u bazi). */
export const BOOKING_FORM_LOCALES = ["me", "en", "ru", "tr"] as const;

export type BookingFormLocale = (typeof BOOKING_FORM_LOCALES)[number];

export function parseBookingLocale(raw: string): BookingFormLocale | null {
  return BOOKING_FORM_LOCALES.includes(raw as BookingFormLocale)
    ? (raw as BookingFormLocale)
    : null;
}

const whoAttends = z.enum(["patient_only", "couple_both", "with_partner"]);

export const bookingRequestFormSchema = z
  .object({
    locale: z.enum(BOOKING_FORM_LOCALES),
    honeypot: z.string().max(200).optional(),
    fullName: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(6).max(64),
    dateOfBirth: z
      .string()
      .optional()
      .transform((v) => (v ?? "").trim())
      .refine(
        (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
        { message: "Datum nije u formatu GGGG-MM-DD." },
      ),
    whoAttends,
    partnerFullName: z.string().max(200).optional(),
    partnerPhone: z.string().max(64).optional(),
    whatBroughtYou: z.string().trim().min(10).max(8000),
    tryingConceiveDuration: z
      .enum([
        "",
        "lt_6m",
        "6_12m",
        "12_24m",
        "gt_24m",
        "prefer_not",
        "na",
      ])
      .transform((v) => (v === "" ? undefined : v)),
    consentAccepted: z
      .boolean()
      .refine((v) => v === true, { message: "consent" }),
  })
  .superRefine((data, ctx) => {
    if (data.whoAttends === "patient_only") return;
    const name = (data.partnerFullName ?? "").trim();
    if (name.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partnerFullName"],
        message: "partnerName",
      });
    }
  });

export type BookingRequestInput = z.infer<typeof bookingRequestFormSchema>;
