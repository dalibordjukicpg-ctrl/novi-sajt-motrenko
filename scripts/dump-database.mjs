/**
 * Eksport lokalne baze → scripts/db-export.sql (UTF-8, za Hostinger/phpMyAdmin).
 *
 * Čita DATABASE_URL ili MYSQL_* iz procesnog okruženja (obično: node --env-file=.env).
 * Za putanju klijenta: MYSQLDUMP_EXE (ili na PATH-u: mysqldump; probaju se i česti XAMPP putevi).
 *
 * npm run db:dump
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(root, ".env"), override: true });

function resolveConnection() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    try {
      const url = new URL(direct);
      const user = decodeURIComponent(url.username || "");
      const password = decodeURIComponent(url.password || "");
      const host = url.hostname || "127.0.0.1";
      const port = url.port || "3306";
      const database = decodeURIComponent((url.pathname || "").replace(/^\//, "").split("/")[0] ?? "");
      if (!user || !database) {
        throw new Error("DATABASE_URL mora imati korisnika i ime baze u putanji.");
      }
      return { user, password, host, port, database };
    } catch {
      throw new Error("Ne mogu parsirati DATABASE_URL.");
    }
  }

  const user = process.env.MYSQL_USER?.trim();
  const password = process.env.MYSQL_PASSWORD ?? "";
  const host = process.env.MYSQL_HOST?.trim() || "127.0.0.1";
  const port = process.env.MYSQL_PORT?.trim() || "3306";
  const database = process.env.MYSQL_DATABASE?.trim();

  if (!user || !database) {
    throw new Error(
      "Postavi DATABASE_URL ili MYSQL_USER + MYSQL_DATABASE (i MYSQL_PASSWORD) u .env",
    );
  }
  return { user, password, host, port, database };
}

function findMysqldump() {
  const fromEnv = process.env.MYSQLDUMP_EXE?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const guessed = [
    "C:\\xampp\\mysql\\bin\\mysqldump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
  ].filter(Boolean);
  for (const p of guessed) {
    if (fs.existsSync(p)) return p;
  }

  const onPath = spawnSync(
    process.platform === "win32" ? "where" : "command",
    process.platform === "win32" ? ["mysqldump"] : ["-v", "mysqldump"],
    { encoding: "utf8" },
  );
  if (onPath.status === 0 && onPath.stdout?.trim()) {
    const first = onPath.stdout.trim().split(/[\r\n]+/)[0];
    if (first) return first.trim();
  }
  return "mysqldump";
}

function writeClientCnf({ user, password, host, port }) {
  const file = path.join(
    os.tmpdir(),
    `mysqldump-cnf-${process.pid}-${Date.now()}.cnf`,
  );
  const body = `[client]
user=${user}
password=${escapeCnf(password)}
host=${host}
port=${port}
`;
  fs.writeFileSync(file, body, "utf8");
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* Windows često ignorira chmod */
  }
  return file;
}

/** Escapuje lozinku u ..cnf (minimalno). */
function escapeCnf(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

function main() {
  let cnfPath;
  try {
    const conn = resolveConnection();
    const outRel = process.argv[2]?.trim() || path.join("scripts", "db-export.sql");
    const outPath = path.isAbsolute(outRel) ? outRel : path.join(root, outRel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    cnfPath = writeClientCnf(conn);
    const exe = findMysqldump();

    const args = [
      `--defaults-extra-file=${cnfPath}`,
      "--single-transaction",
      "--default-character-set=utf8mb4",
      "--no-tablespaces",
      "--skip-routines",
      "--skip-events",
      "--triggers",
      conn.database,
      "--result-file",
      outPath,
    ];

    console.log("mysqldump:", exe);
    console.log(
      "baza:",
      conn.database,
      "@",
      conn.host + ":" + conn.port,
      "→",
      path.relative(root, outPath),
    );

    const r = spawnSync(exe, args, {
      encoding: "utf8",
      stdio: ["ignore", "inherit", "inherit"],
      windowsHide: true,
    });

    if (r.status !== 0 || r.error) {
      console.error(r.error ?? "");
      console.error("\n→ Ako mysqldump nije na PATH-u, postavi MYSQLDUMP_EXE na pun put (npr. C:\\\\xampp\\\\mysql\\\\bin\\\\mysqldump.exe)");
      process.exit(r.status ?? 1);
    }

    console.log("\nGotovo — fajl spreman za Hostinger/phpMyAdmin ili:");
    console.log("  DATABASE_URL=mysql://... node scripts/import-sql-via-mysql2.mjs " + path.relative(root, outPath));
  } catch (e) {
    console.error((e && e.message) || e);
    process.exit(1);
  } finally {
    if (cnfPath) {
      try {
        fs.unlinkSync(cnfPath);
      } catch {
        /* */
      }
    }
  }
}

main();
