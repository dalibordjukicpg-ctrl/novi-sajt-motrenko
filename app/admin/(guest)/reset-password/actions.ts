"use server";

import { eq, and, isNull } from "drizzle-orm";

import { hashPassword, writeAuditLog } from "@/lib/auth";
import { hashOpaqueToken, timingSafeEqualHex } from "@/lib/auth/crypto-token";
import { parseCompoundToken } from "@/lib/auth/parse-compound-token";
import { db } from "@/lib/db";
import { authSessions, passwordResetTokens, users } from "@/lib/db/schema";

export type ResetState = { ok?: boolean; error?: string };

export async function resetPasswordConfirmAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const tokenRaw = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const parsed = parseCompoundToken(tokenRaw);
  if (!parsed) {
    return { error: "Link nije valjan ili je istekao." };
  }

  if (password.length < 8) {
    return { error: "Lozinka mora imati najmanje 8 znakova." };
  }

  const expectedHash = hashOpaqueToken(parsed.secretHex);
  if (!expectedHash) {
    return { error: "Link nije valjan." };
  }

  const now = new Date();
  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      tokenHash: passwordResetTokens.tokenHash,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.id, parsed.id),
        isNull(passwordResetTokens.usedAt),
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
        passwordHash: hashPassword(password),
        updatedAt: now,
      })
      .where(eq(users.id, row.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, row.id));

    await tx
      .update(authSessions)
      .set({ revokedAt: now })
      .where(eq(authSessions.userId, row.userId));
  });

  await writeAuditLog({
    actorUserId: null,
    action: "auth.password_reset_completed",
    subjectType: "user",
    subjectId: row.userId,
  });

  return { ok: true };
}
