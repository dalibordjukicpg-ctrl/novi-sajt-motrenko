"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { writeAuditLog } from "@/lib/auth";
import { getBookingIntakeLabels } from "@/lib/booking/intake-labels";
import { buildBookingEmailBody } from "@/lib/email/booking-email-body";
import { sendBookingNotificationEmail } from "@/lib/email/send-booking-notification";
import {
  DEFAULT_NOTIFY_INBOX,
  resolveNotifyInboxFromEnv,
} from "@/lib/email/resolve-notify-inbox";
import { db } from "@/lib/db";
import { appointmentRequests, siteLocaleStrings } from "@/lib/db/schema";
import { generateBookingPdf } from "@/lib/pdf/generate-booking-pdf";
import { bookingPdfAttachmentName } from "@/lib/pdf/pdf-filenames";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";
import {
  bookingRequestFormSchema,
  parseBookingLocale,
} from "@/lib/validations/booking-request";

function bookingPdfBranding() {
  const siteUrl = getSiteUrl();
  const addr = process.env.CONTACT_PDF_CLINIC_ADDRESS?.trim();
  return {
    clinicName:
      process.env.CONTACT_PDF_CLINIC_NAME?.trim() ||
      "Human Reproduction Center",
    clinicEmail:
      process.env.CONTACT_PDF_CLINIC_EMAIL?.trim() ||
      process.env.BOOKING_NOTIFY_EMAIL?.trim() ||
      process.env.CONTACT_FORM_NOTIFY_EMAIL?.trim() ||
      "info@humanreproduction.com",
    clinicWeb: siteUrl || PRODUCTION_SITE_URL,
    clinicAddress: addr && addr.length > 0 ? addr : undefined,
  };
}

async function resolveBookingNotifyEmail(): Promise<string> {
  const fromEnv = resolveNotifyInboxFromEnv("booking");
  if (fromEnv !== DEFAULT_NOTIFY_INBOX) return fromEnv;

  try {
    const [row] = await db
      .select({ value: siteLocaleStrings.value })
      .from(siteLocaleStrings)
      .where(
        and(
          eq(siteLocaleStrings.fieldKey, "contact.email"),
          eq(siteLocaleStrings.locale, "me"),
        ),
      )
      .limit(1);

    const v = row?.value?.trim();
    if (v && v.includes("@")) return v;
  } catch (e) {
    console.error("[booking] notify email db lookup", e);
  }

  return DEFAULT_NOTIFY_INBOX;
}

export type SubmitBookingState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitBookingRequestAction(
  _prev: SubmitBookingState,
  formData: FormData,
): Promise<SubmitBookingState> {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = parseBookingLocale(localeRaw);
  if (!locale) {
    return { error: "Neispravan jezik." };
  }
  const labels = getBookingIntakeLabels(locale);

  const honeypot = String(formData.get("company_website") ?? "").trim();
  if (honeypot.length > 0) {
    return { ok: true };
  }

  const payload = {
    locale,
    honeypot: "",
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    whoAttends: String(formData.get("whoAttends") ?? ""),
    partnerFullName: String(formData.get("partnerFullName") ?? ""),
    partnerPhone: String(formData.get("partnerPhone") ?? ""),
    whatBroughtYou: String(formData.get("whatBroughtYou") ?? ""),
    tryingConceiveDuration: String(
      formData.get("tryingConceiveDuration") ?? "",
    ),
    consentAccepted: formData.get("consentAccepted") === "on",
  };

  const parsed = bookingRequestFormSchema.safeParse(payload);

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const k of Object.keys(flat)) {
      const key = k as keyof typeof flat;
      const msg = flat[key]?.[0];
      if (msg) {
        fieldErrors[key as string] =
          msg === "partnerName" ? labels.partnerNameRequired : msg;
      }
    }
    return {
      error: labels.errorValidation,
      fieldErrors,
    };
  }

  const data = parsed.data;

  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    ip =
      forwarded?.split(",")[0]?.trim()?.slice(0, 45) ??
      h.get("x-real-ip")?.slice(0, 45) ??
      null;
    userAgent = h.get("user-agent")?.slice(0, 512) ?? null;
  } catch {
    /* ignore */
  }

  const id = randomUUID();
  const now = new Date();

  const partnerAttending =
    data.whoAttends === "patient_only" ? ("no" as const) : ("yes" as const);

  const partnerFullNameDb =
    data.whoAttends === "patient_only"
      ? null
      : (data.partnerFullName ?? "").trim().slice(0, 200) || null;
  const partnerPhoneDb =
    data.whoAttends === "patient_only"
      ? null
      : (data.partnerPhone ?? "").trim().slice(0, 64) || null;

  const dob =
    data.dateOfBirth && data.dateOfBirth.length > 0
      ? data.dateOfBirth.slice(0, 32)
      : null;

  const ttc = data.tryingConceiveDuration ?? null;
  const ttcDb =
    ttc &&
    ["lt_6m", "6_12m", "12_24m", "gt_24m", "prefer_not", "na"].includes(ttc)
      ? ttc
      : null;

  try {
    await db.insert(appointmentRequests).values({
      id,
      locale: data.locale,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      dateOfBirth: dob,
      whoAttends: data.whoAttends,
      partnerFullName: partnerFullNameDb,
      partnerPhone: partnerPhoneDb,
      visitReason: "consultation",
      visitReasonOther: null,
      whatBroughtYou: data.whatBroughtYou.trim(),
      tryingConceiveDuration: ttcDb,
      treatmentElsewhere: null,
      treatmentElsewhereNote: null,
      diagnosesNotes: null,
      medications: null,
      allergies: null,
      lastMenstruationOrNote: null,
      partnerAttending,
      preferredDate: null,
      preferredTimeWindow: null,
      contactPreference: "phone",
      consentAccepted: true,
      createdAt: now,
      ipAddress: ip,
      userAgent,
    });
  } catch (e) {
    console.error(e);
    return { error: labels.errorGeneric };
  }

  await writeAuditLog({
    actorUserId: null,
    action: "booking.request_created",
    subjectType: "appointment_request",
    subjectId: id,
    metadata: { locale: data.locale, email: data.email },
    ipAddress: ip,
    userAgent,
  });

  try {
    const notifyTo = await resolveBookingNotifyEmail();
    const publicRef = id.slice(0, 8).toUpperCase();
    const emailPayload = buildBookingEmailBody({
      labels,
      data,
      publicRef,
    });

    let pdf: Buffer | undefined;
    try {
      pdf = await generateBookingPdf(
        {
          submittedAt: now,
          publicRef,
          data,
          labels,
        },
        bookingPdfBranding(),
      );
    } catch (e) {
      console.error("[booking] pdf", e);
    }

    const filename = bookingPdfAttachmentName(data.email);

    const sent = await sendBookingNotificationEmail({
      to: notifyTo,
      subject: emailPayload.subject,
      text: emailPayload.text,
      pdfBuffer: pdf,
      pdfFilename: filename,
    });

    if (!sent.ok) {
      console.error("[booking] email failed", { id, to: notifyTo });
    }
  } catch (e) {
    console.error("[booking] email block failed", e);
  }

  return { ok: true };
}
