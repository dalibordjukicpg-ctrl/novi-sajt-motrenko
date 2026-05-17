import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { appointmentRequests } from "@/lib/db/schema";

export async function listAppointmentRequestsForAdmin(limit = 200) {
  return db
    .select()
    .from(appointmentRequests)
    .orderBy(desc(appointmentRequests.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}
