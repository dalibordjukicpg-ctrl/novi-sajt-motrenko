import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { adminPath } from "@/lib/admin-base-path";
import { isAllowedPublicFormOrigin } from "@/lib/api-origin-guard";
import { allowChatbotHandoff } from "@/lib/chatbot/rate-limit";
import { bumpChatbotStat } from "@/lib/chatbot/stats";
import { db } from "@/lib/db";
import { chatbotHandoffs } from "@/lib/db/schema";
import { resolveNotifyInboxFromEnv } from "@/lib/email/resolve-notify-inbox";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import { locales } from "@/lib/i18n";
import { getClientIpFromHeaders } from "@/lib/request-client-ip";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";

const payloadSchema = z.object({
  locale: z.enum(locales),
  fullName: z.string().trim().min(2).max(200),
  contact: z.string().trim().min(5).max(255),
  message: z.string().trim().min(3).max(1500),
  consent: z.literal(true),
  /** Honeypot — ljudi ga ne vide. */
  website: z.string().max(200).optional(),
});

/**
 * Poruka iz chata za osoblje: čuva se u adminu (Bot → Poruke osoblju), a obavještenje ide
 * na email klinike ako je Resend podešen. Slanje emaila nije uslov — poruka je već u bazi.
 */
export async function POST(req: Request) {
  if (!isAllowedPublicFormOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if ((parsed.data.website ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIpFromHeaders(req.headers);
  if (!allowChatbotHandoff(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const { locale, fullName, contact, message } = parsed.data;
  const id = randomUUID();
  try {
    await db.insert(chatbotHandoffs).values({
      id,
      locale,
      fullName,
      contact,
      message,
      consentAccepted: true,
      status: "new",
      emailSent: false,
      createdAt: new Date(),
      ipAddress: ip.slice(0, 45),
      userAgent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
    });
  } catch (e) {
    console.error("[chatbot handoff] db insert", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  await bumpChatbotStat(locale, "handoff");

  const adminUrl = `${getSiteUrl() || PRODUCTION_SITE_URL}${adminPath("chatbot/poruke")}`;
  const sent = await sendResendEmail({
    to: resolveNotifyInboxFromEnv("contact"),
    replyTo: contact.includes("@") ? contact : undefined,
    subject: `Poruka iz chat bota — ${fullName}`,
    text: [
      `Pacijent je iz chat bota na sajtu poslao poruku osoblju (${locale.toUpperCase()}).`,
      "",
      `Ime: ${fullName}`,
      `Kontakt: ${contact}`,
      "",
      message,
      "",
      `Sve poruke: ${adminUrl}`,
    ].join("\n"),
    logPrefix: "[chatbot handoff]",
  });
  if (sent.ok) {
    await db.update(chatbotHandoffs).set({ emailSent: true }).where(eq(chatbotHandoffs.id, id));
  }

  return NextResponse.json({ ok: true });
}
