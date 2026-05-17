"use server";

import { and, eq, isNull } from "drizzle-orm";

import { writeAuditLog } from "@/lib/auth";
import { hashOpaqueToken, timingSafeEqualHex } from "@/lib/auth/crypto-token";
import { parseCompoundToken } from "@/lib/auth/parse-compound-token";
import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";

export type VerifyState = { ok?: boolean; error?: string };

export async function verifyEmailConfirmAction(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const tokenRaw = String(formData.get("token") ?? "");
  const parsed = parseCompoundToken(tokenRaw);
  if (!parsed) {
    return { error: "Link nije valjan ili je istekao." };
  }

  const expectedHash = hashOpaqueToken(parsed.secretHex);
  if (!expectedHash) {
    return { error: "Link nije valjan." };
  }

  const now = new Date();
  const [row] = await db
    .select({
      id: emailVerificationTokens.id,
      userId: emailVerificationTokens.userId,
      tokenHash: emailVerificationTokens.tokenHash,
      expiresAt: emailVerificationTokens.expiresAt,
      usedAt: emailVerificationTokens.usedAt,
    })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.id, parsed.id),
        isNull(emailVerificationTokens.usedAt),
      ),
    )
    .limit(1);

  if (!row || row.expiresAt <= now) {
    return { error: "Link nije valjan ili je istekao." };
  }

  if (!timingSafeEqualHex(row.tokenHash, expectedHash)) {
    return { error: "Link nije valjan ili je istekao." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        emailVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, row.userId));

    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokens.id, row.id));
  });

  await writeAuditLog({
    actorUserId: row.userId,
    action: "auth.email_verified",
    subjectType: "user",
    subjectId: row.userId,
  });

  return { ok: true };
}
