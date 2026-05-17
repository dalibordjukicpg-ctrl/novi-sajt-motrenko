import { z } from "zod";

import { locales, type Locale } from "@/lib/i18n";

export type ContactFormLocale = Locale;

const stripControl = (s: string) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

export const contactFormPayloadSchema = z.object({
  locale: z.enum(locales),
  /** Antibot: mora ostati prazno (ne smije biti "Website" — autofill ga puni). */
  form_hp_token: z.string().max(200).optional(),
  fullName: z
    .string()
    .max(200)
    .transform((v) => stripControl(v.trim()))
    .refine((v) => v.length >= 2, { message: "Ime i prezime moraju imati najmanje 2 karaktera." }),
  email: z
    .string()
    .max(255)
    .transform((v) => stripControl(v.trim().toLowerCase()))
    .pipe(z.string().email({ message: "Email nije ispravan." })),
  phone: z
    .string()
    .max(64)
    .transform((v) => stripControl(v.replace(/\s+/g, " ").trim()))
    .refine((v) => v.length >= 6, { message: "Telefon mora imati najmanje 6 karaktera." }),
  message: z
    .string()
    .max(8000)
    .transform((v) => stripControl(v.trim()))
    .refine((v) => v.length >= 10, { message: "Poruka mora imati najmanje 10 karaktera." }),
  inquiryType: z
    .string()
    .max(500)
    .optional()
    .transform((v) => {
      const t = stripControl((v ?? "").trim());
      return t.length === 0 ? undefined : t;
    }),
  consentAccepted: z.boolean().refine((v) => v === true, {
    message: "Potrebna je saglasnost za obradu ličnih podataka.",
  }),
});

export type ContactFormPayload = z.infer<typeof contactFormPayloadSchema>;

/** Validacija na klijentu (honeypot se šalje odvojeno u API tijelu). */
export const contactFormClientSchema = contactFormPayloadSchema.omit({
  form_hp_token: true,
});

export type ContactFormClientValues = z.input<typeof contactFormClientSchema>;
