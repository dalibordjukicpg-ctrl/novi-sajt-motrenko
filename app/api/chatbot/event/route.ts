import { NextResponse } from "next/server";
import { z } from "zod";

import { isAllowedPublicFormOrigin } from "@/lib/api-origin-guard";
import { allowChatbotQuestion } from "@/lib/chatbot/rate-limit";
import { bumpChatbotStat } from "@/lib/chatbot/stats";
import { locales } from "@/lib/i18n";
import { getClientIpFromHeaders } from "@/lib/request-client-ip";

export const runtime = "nodejs";

const payloadSchema = z.object({
  locale: z.enum(locales),
  event: z.literal("open"),
});

/** Brojač otvaranja chata (statistika, bez ličnih podataka). */
export async function POST(req: Request) {
  if (!isAllowedPublicFormOrigin(req)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!allowChatbotQuestion(getClientIpFromHeaders(req.headers))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  await bumpChatbotStat(parsed.data.locale, parsed.data.event);
  return NextResponse.json({ ok: true });
}
