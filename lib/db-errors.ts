/** Vraća korisniku bezbednu poruku ako je greška od MySQL konekcije. */
function dbNameFromUnknownDbMessage(sqlMessage: string): string {
  const m = sqlMessage.match(/Unknown database ['"]([^'"]+)['"]/i);
  return m?.[1] ?? "ime_baze";
}

export function isDbConnectionError(e: unknown): boolean {
  const err = e as { code?: string };
  return (
    err.code === "ER_ACCESS_DENIED_ERROR" ||
    err.code === "ER_BAD_DB_ERROR" ||
    err.code === "ER_NO_SUCH_TABLE" ||
    err.code === "ECONNREFUSED" ||
    err.code === "ENOTFOUND" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ECONNRESET" ||
    err.code === "PROTOCOL_CONNECTION_LOST"
  );
}

/** Poruka za korisnika na osnovu greške (bez osetljivih podataka). */
export function getDbConnectionUserMessage(e: unknown): string {
  const err = e as { code?: string; sqlMessage?: string; message?: string };
  const msg = err.sqlMessage ?? err.message ?? "";

  if (err.code === "ER_BAD_DB_ERROR") {
    return `Baza iz MYSQL_DATABASE / URL ne postoji na MySQL serveru. Otvori phpMyAdmin → "Nova baza" ili SQL: CREATE DATABASE \`${dbNameFromUnknownDbMessage(msg)}\`; zatim npm run db:migrate.`;
  }

  if (err.code === "ER_ACCESS_DENIED_ERROR") {
    if (msg.includes("'user'") || /Access denied for user ['"]user['"]/i.test(msg)) {
      return "U .env je još primjer iz uputstva: korisnik \"user\" i lozinka \"pass\" nisu tvoji pravi MySQL podaci. Zamijeni ih podacima koje koristiš u phpMyAdmin ili XAMPP (često je korisnik root). Ili obriši DATABASE_URL i koristi MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.";
    }
    return "Pogrešan MySQL korisnik ili lozinka u .env. Provjeri DATABASE_URL ili MYSQL_*.";
  }

  if (err.code === "ECONNREFUSED") {
    return "Ne može da se poveže na MySQL (port 3306?). Pokreni MySQL/MariaDB (npr. XAMPP → Start uz MySQL).";
  }

  if (err.code === "ER_NO_SUCH_TABLE") {
    return "U bazi nedostaju tabele. Na serveru pokreni migracije: npm run db:migrate (sa istim DATABASE_URL kao na Vercelu).";
  }

  if (
    err.code === "ECONNRESET" ||
    err.code === "PROTOCOL_CONNECTION_LOST"
  ) {
    return "Veza sa bazom je prekinuta. Provjeri DATABASE_URL, SSL i da MySQL na cloudu dopušta konekcije sa Vercela.";
  }

  if (err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
    return "Host iz `DATABASE_URL` / `MYSQL_HOST` nije dostupan.";
  }

  return dbConnectionHint();
}

export function dbConnectionHint(): string {
  return "U .env postavi ispravan `DATABASE_URL` ili `MYSQL_USER`, `MYSQL_PASSWORD` i `MYSQL_DATABASE`.";
}