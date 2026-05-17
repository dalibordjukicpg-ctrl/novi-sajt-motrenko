import { randomUUID } from "crypto";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export type AuditPayload = {
  actorUserId: string | null;
  action: string;
  subjectType?: string | null;
  subjectId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(payload: AuditPayload): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      actorUserId: payload.actorUserId,
      action: payload.action,
      subjectType: payload.subjectType ?? null,
      subjectId: payload.subjectId ?? null,
      metadata: payload.metadata
        ? JSON.stringify(payload.metadata).slice(0, 16_000)
        : null,
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent?.slice(0, 512) ?? null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
