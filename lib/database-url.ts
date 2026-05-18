/**
 * Jedan od dva načina u .env / environment (Hostinger hPanel, Vercel…):
 * 1) DATABASE_URL=mysql://user:pass@host:3306/db  (posebni znakovi u lozinki → URL-encode)
 * 2) MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE (+ opciono MYSQL_HOST, MYSQL_PORT)
 *
 * **`DATABASE_URL` ima prednost** nad MYSQL_* ako je postavljen i nije prazan nakon čišćenja.
 *
 * Na Hostingeru koristi tačan MySQL hostname iz panela („Databases”) — često **`localhost`**,
 * ali ponekad **`mysqlXXXX.hostinger.io`** ili slično; kopiraj ono što panel prikaže zajedno
 * sa korisnikom i bazom koju si kreirao (ne prešifravati ručno ako panel već izveze jedan URL).
 *
 * Za Unicode (utf8mb4) aplikacija koristi {@link createMysqlPoolUtf8mb4} pri `createPool`.
 */

/** BOM + navodnici kojima neki hosting paneli uviju vrijednosti env-a. */
function cleanEnvScalar(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  let s = String(value).trim().replace(/^\uFEFF/, "");
  if (!s) return undefined;
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

function normalizeMysqlProtocol(url: string): string {
  if (/^mysql2:\/\//i.test(url)) {
    return url.replace(/^mysql2:/i, "mysql:");
  }
  return url;
}

export function getDatabaseUrl(): string {
  const raw = cleanEnvScalar(process.env.DATABASE_URL);
  if (raw) {
    return normalizeMysqlProtocol(raw);
  }

  const user = cleanEnvScalar(process.env.MYSQL_USER);
  const password = cleanEnvScalar(process.env.MYSQL_PASSWORD) ?? "";
  const host = cleanEnvScalar(process.env.MYSQL_HOST) || "127.0.0.1";
  const port = cleanEnvScalar(process.env.MYSQL_PORT) || "3306";
  const database = cleanEnvScalar(process.env.MYSQL_DATABASE);

  if (user && database) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }

  throw new Error(
    "Postavi DATABASE_URL ili kombinaciju MYSQL_USER, MYSQL_PASSWORD i MYSQL_DATABASE u .env",
  );
}

/**
 * Izvorna WordPress MySQL baza (ETL skripte). Ne mijenja glavni DATABASE_URL.
 * WP_DATABASE_URL ili WP_MYSQL_* varijable.
 */
export function getWpSourceDatabaseUrl(): string {
  const raw = cleanEnvScalar(process.env.WP_DATABASE_URL);
  if (raw) {
    return normalizeMysqlProtocol(raw);
  }

  const user = cleanEnvScalar(process.env.WP_MYSQL_USER);
  const password = cleanEnvScalar(process.env.WP_MYSQL_PASSWORD) ?? "";
  const host = cleanEnvScalar(process.env.WP_MYSQL_HOST) || "127.0.0.1";
  const port = cleanEnvScalar(process.env.WP_MYSQL_PORT) || "3306";
  const database = cleanEnvScalar(process.env.WP_MYSQL_DATABASE);

  if (user && database) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }

  throw new Error(
    "Za ETL postavi WP_DATABASE_URL ili WP_MYSQL_USER, WP_MYSQL_PASSWORD, WP_MYSQL_DATABASE (i opciono WP_MYSQL_HOST, WP_MYSQL_PORT).",
  );
}

/** Bez lozinke — za `/api/db-test` dokaz odakle se uzima konekcija. */
export type DatabaseConfigSnapshot = {
  /** Odakle `getDatabaseUrl()` uzima vrijednosti. */
  resolvedFrom: "DATABASE_URL" | "MYSQL_ENV" | "missing";
  /** Je li barem jedan karakter u `DATABASE_URL` nakon čišćenja. */
  databaseUrlEnvLooksSet: boolean;
  /** Duljina vrijednosti (bez otkrivanja sadržaja). */
  databaseUrlChars: number;
  /** Postoje li MYSQL_USER i MYSQL_DATABASE (čak i ako pobjeđuje DATABASE_URL). */
  mysqlEnvPiecesDetected: boolean;
  host: string | null;
  port: string | null;
  database: string | null;
  user: string | null;
  /** Jedina poruka kod nevalidnog DATABASE_URL forma. */
  parseNote: string | null;
};

/**
 * Diagnostički pregled koji env polja aktiviraju Drizzle/mysql2 (nikad lozinka).
 * Za produkcijsko zaključivanje ako Hostinger ima postavljen `DATABASE_URL` ali app i dalje puca.
 */
export function getDatabaseConfigSnapshot(): DatabaseConfigSnapshot {
  const dbUrlRaw = cleanEnvScalar(process.env.DATABASE_URL);
  const mysqlUser = cleanEnvScalar(process.env.MYSQL_USER);
  const mysqlDb = cleanEnvScalar(process.env.MYSQL_DATABASE);
  const mysqlPieces = !!(mysqlUser && mysqlDb);

  if (dbUrlRaw) {
    try {
      const normalized = normalizeMysqlProtocol(dbUrlRaw);
      const pseudo = normalized.replace(/^mysql:/i, "http:");
      const u = new URL(pseudo);
      const dbPath = decodeURIComponent(
        u.pathname.replace(/^\//, "").split("/")[0] ?? "",
      );
      return {
        resolvedFrom: "DATABASE_URL",
        databaseUrlEnvLooksSet: true,
        databaseUrlChars: dbUrlRaw.length,
        mysqlEnvPiecesDetected: mysqlPieces,
        host: u.hostname || null,
        port: u.port || "3306",
        database: dbPath || null,
        user: u.username ? decodeURIComponent(u.username) : null,
        parseNote: null,
      };
    } catch {
      return {
        resolvedFrom: "DATABASE_URL",
        databaseUrlEnvLooksSet: true,
        databaseUrlChars: dbUrlRaw.length,
        mysqlEnvPiecesDetected: mysqlPieces,
        host: null,
        port: null,
        database: null,
        user: null,
        parseNote:
          "DATABASE_URL se ne parsira kao očekivani mysql:// URL — provjerite navodnike, razmake ili specijalne znakove u lozinci (moraju biti URL-encode).",
      };
    }
  }

  if (mysqlPieces) {
    const host = cleanEnvScalar(process.env.MYSQL_HOST) || "127.0.0.1";
    const port = cleanEnvScalar(process.env.MYSQL_PORT) || "3306";
    return {
      resolvedFrom: "MYSQL_ENV",
      databaseUrlEnvLooksSet: false,
      databaseUrlChars: 0,
      mysqlEnvPiecesDetected: true,
      host,
      port,
      database: mysqlDb!,
      user: mysqlUser!,
      parseNote: null,
    };
  }

  return {
    resolvedFrom: "missing",
    databaseUrlEnvLooksSet: !!cleanEnvScalar(process.env.DATABASE_URL),
    databaseUrlChars: cleanEnvScalar(process.env.DATABASE_URL)?.length ?? 0,
    mysqlEnvPiecesDetected: false,
    host: null,
    port: null,
    database: null,
    user: null,
    parseNote: null,
  };
}