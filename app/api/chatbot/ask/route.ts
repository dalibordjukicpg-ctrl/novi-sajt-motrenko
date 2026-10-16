import { NextResponse } from "next/server";
import { z } from "zod";

import { isAllowedPublicFormOrigin } from "@/lib/api-origin-guard";
import { answerQuestion } from "@/lib/chatbot/answer";
import { allowChatbotQuestion } from "@/lib/chatbot/rate-limit";
import { getPublicChatbotConfig } from "@/lib/chatbot/settings";
import { bumpChatbotStat } from "@/lib/chatbot/stats";
import { locales } from "@/lib/i18n";
import { getClientIpFromHeaders } from "@/lib/request-client-ip";

export const runtime = "nodejs";

const payloadSchema = z.object({
  locale: z.enum(locales),
  q: z.string().trim().min(1).max(500),
});

/** Pitanje iz chat prozora → odgovor iz baze znanja. Tekst pitanja se ne čuva. */
export async function POST(req: Request) {
  if (!isAllowedPublicFormOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Neispravan zahtjev." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Neispravan zahtjev." }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Neispravan zahtjev." }, { status: 400 });
  }

  if (!allowChatbotQuestion(getClientIpFromHeaders(req.headers))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const { locale, q } = parsed.data;
  const config = await getPublicChatbotConfig(locale);
  if (!config.enabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 503 });
  }

  try {
    const reply = await answerQuestion(locale, q);
    await bumpChatbotStat(locale, "question");
    if (reply.kind === "answer" || reply.kind === "smalltalk") {
      await bumpChatbotStat(locale, "answered", reply.statKey);
    } else {
      await bumpChatbotStat(locale, reply.kind, reply.statKey);
    }
    return NextResponse.json({ ok: true, reply });
  } catch (e) {
    console.error("[chatbot ask]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
