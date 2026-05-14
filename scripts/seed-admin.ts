import "./load-dotenv";

import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../lib/db";
import { users } from "../lib/db/schema";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com")
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

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    if (process.env.SEED_UPDATE_PASSWORD === "1") {
      const passwordHash = hashSync(password, 12);
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
    console.log("(Na Windows PowerShell: $env:SEED_UPDATE_PASSWORD=\"1\"; npm run seed:admin)");
    process.exit(0);
  }

  const passwordHash = hashSync(password, 12);
  const now = new Date();

  await db.insert(users).values({
    id: randomUUID(),
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Admin korisnik kreiran: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
