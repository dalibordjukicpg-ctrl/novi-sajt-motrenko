import { NextResponse } from "next/server";

import { isAllowedPublicFormOrigin } from "@/lib/api-origin-guard";
import { allowBookingSubmission } from "@/lib/booking-rate-limit";
import { processBookingSubmission } from "@/lib/booking/process-booking-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim()?.slice(0, 45) ??
    req.headers.get("x-real-ip")?.slice(0, 45) ??
    null
  );
}

export async function POST(req: Request) {
  if (!isAllowedPublicFormOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: "Neispravan zahtjev." },
      { status: 403 },
    );
  }

  const ip = clientIp(req) ?? "unknown";
  if (!allowBookingSubmission(ip)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Previše pokušaja u kratkom roku. Sačekajte minut pa pokušajte ponovo.",
      },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Neispravan zahtjev." },
      { status: 400 },
    );
  }

  const result = await processBookingSubmission(formData, {
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
  });

  if (result.ok) {
    return NextResponse.json(result);
  }

  const status = result.fieldErrors ? 400 : 500;
  return NextResponse.json(result, { status });
}
