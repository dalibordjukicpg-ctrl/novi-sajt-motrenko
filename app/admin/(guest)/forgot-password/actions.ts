"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { hashOpaqueToken, randomUrlToken } from "@/lib/auth/crypto-token";
import { writeAuditLog } from "@/lib/auth/audit-log";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import {
  resetPasswordEmailBody,
  sendAuthEmail,
} from "@/lib/email/send-auth-email";

export type ForgotState = { ok?: boolean; error?: string };

export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Unesite email." };
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  /** Jednaki odgovor radi zaštite od enumeracije naloga. */
  const genericOk: ForgotState = {
    ok: true,
  };

  if (!user) {
    return genericOk;
  }

  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  const tokenId = randomUUID();
  const secretHex = randomUrlToken();
  const tokenHash = hashOpaqueToken(secretHex);
  if (!tokenHash) return genericOk;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60);

  await db.insert(passwordResetTokens).values({
    id: tokenId,
    userId: user.id,
    tokenHash,
    expiresAt,
    usedAt: null,
    createdAt: now,
  });

  const rawToken = `${tokenId}.${secretHex}`;
  const { subject, text } = resetPasswordEmailBody({ token: rawToken });
  await sendAuthEmail({ to: email, subject, text });

  await writeAuditLog({
    actorUserId: null,
    action: "auth.password_reset_requested",
    subjectType: "user",
    subjectId: user.id,
  });

  return genericOk;
}
