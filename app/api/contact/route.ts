import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { allowContactSubmission } from "@/lib/contact-rate-limit";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";
import {
  buildContactEmailSummary,
  sendContactFormEmail,
} from "@/lib/email/send-contact-form";
import { generateContactPdf } from "@/lib/pdf/generate-contact-pdf";
import { contactFormPayloadSchema } from "@/lib/validations/contact-form";

export const runtime = "nodejs";

/** Fiksni primalac e-pošte sa kontakt forme (tekst + PDF). */
const CONTACT_FORM_NOTIFY_INBOX = "info@humanreproduction.com";

function getClientIp(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    "";
  return ip.slice(0, 128) || "unknown";
}

function contactBranding() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const addr = process.env.CONTACT_PDF_CLINIC_ADDRESS?.trim();
  return {
    clinicName:
      process.env.CONTACT_PDF_CLINIC_NAME?.trim() ||
      "Human Reproduction Center",
    clinicEmail:
      process.env.CONTACT_PDF_CLINIC_EMAIL?.trim() ||
      CONTACT_FORM_NOTIFY_INBOX,
    clinicWeb: siteUrl || "https://humanreproduction.com",
    clinicAddress: addr && addr.length > 0 ? addr : undefined,
  };
}

function notifyEmail(): string {
  return CONTACT_FORM_NOTIFY_INBOX;
}

type ErrorBody = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
};

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json<ErrorBody>(
      { ok: false, error: "Neispravan zahtjev." },
      { status: 400 },
    );
  }

  const parsed = contactFormPayloadSchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(flat)) {
      if (!v?.[0]) continue;
      if (k === "form_hp_token") continue;
      fieldErrors[k] = v[0];
    }
    return NextResponse.json<ErrorBody>(
      {
        ok: false,
        error: "Provjerite obavezna polja i pokušajte ponovno.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const trap = (parsed.data.form_hp_token ?? "").trim();
  if (trap.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const h = await headers();
  const ip = getClientIp(h);

  if (!allowContactSubmission(ip)) {
    return NextResponse.json<ErrorBody>(
      {
        ok: false,
        error:
          "Previše pokušaja slanja u kratkom roku. Sačekajte minut pa pokušajte ponovo.",
      },
      { status: 429 },
    );
  }

  const { form_hp_token: _hp, ...data } = parsed.data;

  let userAgent: string | null = null;
  try {
    userAgent = h.get("user-agent")?.slice(0, 512) ?? null;
  } catch {
    userAgent = null;
  }

  const id = randomUUID();
  const submittedAt = new Date();
  const branding = contactBranding();
  const to = notifyEmail();

  try {
    await db.insert(contactSubmissions).values({
      id,
      locale: data.locale,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      inquiryType: data.inquiryType ?? null,
      message: data.message,
      consentAccepted: true,
      emailSent: false,
      createdAt: submittedAt,
      ipAddress: ip.slice(0, 45),
      userAgent,
    });
  } catch (e) {
    console.error("[contact form] db insert", e);
    return NextResponse.json<ErrorBody>(
      { ok: false, error: "Slanje trenutno nije moguće. Pokušajte kasnije." },
      { status: 500 },
    );
  }

  const pdfPayload = {
    submittedAt,
    locale: data.locale,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    inquiryType: data.inquiryType ?? null,
    message: data.message,
    consentAccepted: true,
  };

  let pdf: Buffer;
  try {
    pdf = await generateContactPdf(pdfPayload, branding);
  } catch (e) {
    console.error("[contact form] pdf", e);
    return NextResponse.json<ErrorBody>(
      { ok: false, error: "Slanje trenutno nije moguće. Pokušajte kasnije." },
      { status: 500 },
    );
  }

  const filename = `kontakt-upit-${submittedAt
    .toISOString()
    .slice(0, 19)
    .replace(/:/g, "-")}.pdf`;
  const summary = buildContactEmailSummary(pdfPayload, branding);

  const sent = await sendContactFormEmail({
    to,
    summaryText: summary,
    pdfBuffer: pdf,
    pdfFilename: filename,
  });

  if (!sent.ok) {
    console.error("[contact form] email failed", { id, sent });
    if (sent.code === "missing_api_key") {
      return NextResponse.json<ErrorBody>(
        {
          ok: false,
          error:
            "E-pošta nije podešena na serveru (nedostaje RESEND_API_KEY u .env). Kontaktirajte administratora sajta.",
        },
        { status: 502 },
      );
    }
    const hint =
      sent.status === 403 ||
      /domain|verify|not valid|from/i.test(sent.bodySnippet);
    return NextResponse.json<ErrorBody>(
      {
        ok: false,
        error: hint
          ? "Servis za e-poštu (Resend) je odbio slanje. Provjerite RESEND_FROM (mora biti sa verifikovanim domenom) i u Resend nalogu dozvolite slanje na info@humanreproduction.com."
          : "Slanje e-pošte nije uspjelo. Provjerite RESEND_API_KEY i RESEND_FROM u .env fajlu i pokušajte ponovo.",
      },
      { status: 502 },
    );
  }

  try {
    await db
      .update(contactSubmissions)
      .set({ emailSent: true })
      .where(eq(contactSubmissions.id, id));
  } catch (e) {
    console.error("[contact form] emailSent flag", e);
  }

  return NextResponse.json({ ok: true });
}
