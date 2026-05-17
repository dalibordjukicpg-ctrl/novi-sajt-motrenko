import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export type AuditLogRow = {
  id: string;
  actorUserId: string | null;
  action: string;
  subjectType: string | null;
  subjectId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

export async function listAuditLogs(opts: {
  limit?: number;
  actionFilter?: string;
}): Promise<AuditLogRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);

  const f = String(opts.actionFilter ?? "").trim();

  const qb = db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      action: auditLogs.action,
      subjectType: auditLogs.subjectType,
      subjectId: auditLogs.subjectId,
      metadata: auditLogs.metadata,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs);

  const filtered =
    f.length > 0 ? qb.where(eq(auditLogs.action, f)) : qb;

  return filtered.orderBy(desc(auditLogs.createdAt)).limit(limit);
}
