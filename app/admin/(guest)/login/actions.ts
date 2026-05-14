"use server";

import { compareSync } from "bcryptjs";
import { eq } from "drizzle-orm";

import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type LoginState = { error: string | null; ok?: boolean };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Unesite email i lozinku.", ok: false };
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { error: "Pogrešan email ili lozinka.", ok: false };
    }

    const ok = compareSync(password, user.passwordHash);
    if (!ok) {
      return { error: "Pogrešan email ili lozinka.", ok: false };
    }

    await createSession(user.id);
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message.includes("AUTH_SECRET")) {
      return {
        error:
          "Sesija nije uspjela (provjeri AUTH_SECRET u .env, min. 32 karaktera).",
        ok: false,
      };
    }
    return {
      error:
        "Prijava nije uspjela (provjeri MySQL / DATABASE_URL u .env).",
      ok: false,
    };
  }

  /** Pun reload osigurava cookie + RSC; `redirect` iz useActionState često ne promijeni stranicu. */
  return { error: null, ok: true };
}
