"use server";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import {
  DEFAULT_SUPER_ADMIN_EMAIL,
  getSession,
  hashPassword,
  hasPermission,
  isProtectedSuperAdminTarget,
  PERMISSIONS,
  writeAuditLog,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  emailVerificationTokens,
  users,
  type UserRole,
} from "@/lib/db/schema";
import { canActorEditTargetUser } from "@/lib/queries/admin-users";
import { verifyEmailBody, sendAuthEmail } from "@/lib/email/send-auth-email";
import { hashOpaqueToken, randomUrlToken } from "@/lib/auth/crypto-token";

function protectedSuperEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
}
const ASSIGNABLE_BY_ADMIN: UserRole[] = ["ADMIN", "STAFF", "USER"];

const roles = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF", "USER"]);

async function reqMeta() {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const ua = h.get("user-agent");
    return {
      ip: ip ? ip.slice(0, 45) : null,
      userAgent: ua ? ua.slice(0, 512) : null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function createUserAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, PERMISSIONS.USERS_MANAGE)) {
    return { error: "Nemate dozvolu za kreiranje korisnika." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "USER");
  const parsedRole = roles.safeParse(roleRaw);
  if (!parsedRole.success) {
    return { error: "Nepoznata uloga." };
  }
  let role: UserRole = parsedRole.data;

  if (session.role !== "SUPER_ADMIN") {
    if (!ASSIGNABLE_BY_ADMIN.includes(role)) {
      return { error: "Ne možete dodijeliti ovu ulogu." };
    }
  }

  if (!z.string().email().safeParse(email).success) {
    return { error: "Neispravan email." };
  }

  if (password.length < 8) {
    return { error: "Lozinka mora imati najmanje 8 znakova." };
  }

  if (!canActorEditTargetUser(session.role, role)) {
    return { error: "Ne možete upravljati ovom ulogom." };
  }

  const [exists] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (exists) {
    return { error: "Korisnik sa ovim emailom već postoji." };
  }

  const now = new Date();
  const id = randomUUID();

  await db.insert(users).values({
    id,
    email,
    passwordHash: hashPassword(password),
    role,
    isActive: true,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, id));

  const verifyId = randomUUID();
  const verifySecret = randomUrlToken();
  const verifyHash = hashOpaqueToken(verifySecret);
  if (verifyHash) {
    await db.insert(emailVerificationTokens).values({
      id: verifyId,
      userId: id,
      tokenHash: verifyHash,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      usedAt: null,
      createdAt: now,
    });
    const rawVerify = `${verifyId}.${verifySecret}`;
    const ve = verifyEmailBody({ token: rawVerify });
    await sendAuthEmail({ to: email, subject: ve.subject, text: ve.text });
  }

  const meta = await reqMeta();
  await writeAuditLog({
    actorUserId: session.userId,
    action: "users.create",
    subjectType: "user",
    subjectId: id,
    metadata: { email, role },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUserRoleAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, PERMISSIONS.USERS_ROLES)) {
    return { error: "Nemate dozvolu za izmjenu uloga." };
  }

  const userId = String(formData.get("userId") ?? "");
  if (!z.string().uuid().safeParse(userId).success) {
    return { error: "Neispravan korisnik." };
  }

  const roleRaw = String(formData.get("role") ?? "");
  const parsedRole = roles.safeParse(roleRaw);
  if (!parsedRole.success) {
    return { error: "Nepoznata uloga." };
  }
  const newRole = parsedRole.data;

  const [target] = await db
    .select({
      id: users.id,
      role: users.role,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return { error: "Korisnik nije pronađen." };
  }

  if (!canActorEditTargetUser(session.role, target.role)) {
    return { error: "Ne možete mijenjati ovog korisnika." };
  }

  if (isProtectedSuperAdminTarget(session.role, newRole)) {
    return { error: "Ne možete dodijeliti SUPER_ADMIN." };
  }

  if (
    target.email === protectedSuperEmail() &&
    newRole !== "SUPER_ADMIN"
  ) {
    return {
      error: "Glavni SUPER_ADMIN nalog mora ostati SUPER_ADMIN.",
    };
  }

  if (session.role !== "SUPER_ADMIN" && !ASSIGNABLE_BY_ADMIN.includes(newRole)) {
    return { error: "Ne možete dodijeliti ovu ulogu." };
  }

  await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const meta = await reqMeta();
  await writeAuditLog({
    actorUserId: session.userId,
    action: "users.role_change",
    subjectType: "user",
    subjectId: userId,
    metadata: { from: target.role, to: newRole },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActiveAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, PERMISSIONS.USERS_DEACTIVATE)) {
    return { error: "Nemate dozvolu za aktivaciju / deaktivaciju." };
  }

  const userId = String(formData.get("userId") ?? "");
  if (!z.string().uuid().safeParse(userId).success) {
    return { error: "Neispravan korisnik." };
  }

  const active = String(formData.get("active") ?? "") === "1";

  const [target] = await db
    .select({
      id: users.id,
      role: users.role,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return { error: "Korisnik nije pronađen." };
  }

  if (!canActorEditTargetUser(session.role, target.role)) {
    return { error: "Ne možete mijenjati ovog korisnika." };
  }

  if (target.email === protectedSuperEmail() && !active) {
    return { error: "Ne možete deaktivirati glavni SUPER_ADMIN nalog." };
  }

  if (userId === session.userId && !active) {
    return { error: "Ne možete deaktivirati sopstveni nalog dok ste prijavljeni." };
  }

  await db
    .update(users)
    .set({ isActive: active, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const meta = await reqMeta();
  await writeAuditLog({
    actorUserId: session.userId,
    action: active ? "users.activate" : "users.deactivate",
    subjectType: "user",
    subjectId: userId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, PERMISSIONS.USERS_MANAGE)) {
    return { error: "Nemate dozvolu." };
  }

  const userId = String(formData.get("userId") ?? "");
  if (!z.string().uuid().safeParse(userId).success) {
    return { error: "Neispravan korisnik." };
  }

  if (userId === session.userId) {
    return { error: "Ne možete obrisati sopstveni nalog." };
  }

  const [target] = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) return { error: "Korisnik nije pronađen." };
  if (!canActorEditTargetUser(session.role, target.role)) {
    return { error: "Ne možete obrisati ovog korisnika." };
  }
  if (target.email === protectedSuperEmail()) {
    return { error: "Ne možete obrisati glavni SUPER_ADMIN nalog." };
  }

  await db.delete(users).where(eq(users.id, userId));

  const meta = await reqMeta();
  await writeAuditLog({
    actorUserId: session.userId,
    action: "users.delete",
    subjectType: "user",
    subjectId: userId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
