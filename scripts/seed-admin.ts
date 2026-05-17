import "./load-dotenv";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import {
  DEFAULT_SUPER_ADMIN_EMAIL,
  hashPassword,
} from "../lib/auth";
import { db } from "../lib/db";
import { users, type UserRole } from "../lib/db/schema";

async function main() {
  const superEmail = (
    process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();

  const email = (process.env.SEED_ADMIN_EMAIL ?? superEmail)
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password || password.length < 1) {
    console.error("Postavi SEED_ADMIN_PASSWORD u .env i ponovi.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.warn(
      "Upozorenje: kratka seed lozinka — samo za lokalni dev; u produkciji min. 8+.",
    );
  }

  /** Uvijek podigni SUPER_ADMIN ulogu za glavni email (zahtjev projekta). */
  const [existingSuper] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, superEmail))
    .limit(1);

  if (existingSuper) {
    await db
      .update(users)
      .set({
        role: "SUPER_ADMIN",
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingSuper.id));
    console.log(`SUPER_ADMIN uloga osigurana za: ${superEmail}`);
  }

  const [existing] = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    if (process.env.SEED_UPDATE_PASSWORD === "1") {
      const passwordHash = hashPassword(password);
      const now = new Date();
      await db
        .update(users)
        .set({ passwordHash, updatedAt: now })
        .where(eq(users.email, email));
      console.log(`Lozinka ažurirana za: ${email}`);
      process.exit(0);
      return;
    }
    console.log(`Korisnik već postoji: ${email}`);
    console.log(
      "Ako lozinka iz .env ne radi, pokreni: SEED_UPDATE_PASSWORD=1 npm run seed:admin",
    );
    console.log(
      "(Na Windows PowerShell: $env:SEED_UPDATE_PASSWORD=\"1\"; npm run seed:admin)",
    );
    process.exit(0);
  }

  const passwordHash = hashPassword(password);
  const now = new Date();

  let role: UserRole = "ADMIN";
  if (email === superEmail) {
    role = "SUPER_ADMIN";
  }

  await db.insert(users).values({
    id: randomUUID(),
    email,
    passwordHash,
    role,
    isActive: true,
    emailVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Admin korisnik kreiran: ${email} (${role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
