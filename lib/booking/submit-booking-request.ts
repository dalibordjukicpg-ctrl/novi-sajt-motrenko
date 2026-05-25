"use server";

import { headers } from "next/headers";

import {
  processBookingSubmission,
  type SubmitBookingState,
} from "@/lib/booking/process-booking-submission";

export type { SubmitBookingState };

export async function submitBookingRequestAction(
  _prev: SubmitBookingState,
  formData: FormData,
): Promise<SubmitBookingState> {
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

  return processBookingSubmission(formData, { ip, userAgent });
}
