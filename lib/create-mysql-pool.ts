import mysql from "mysql2/promise";

/**
 * Pool sa eksplicitnim `utf8mb4` (emoji, ć, š, ž, …) — izbjegava mojibake pri upisu/čitanju.
 * Koristi `uri` + `charset` kako mysql2 spaja URL i opcije (vidi ConnectionConfig).
 */
export function createMysqlPoolUtf8mb4(connectionUri: string): mysql.Pool {
  return mysql.createPool({
    uri: connectionUri,
    charset: "utf8mb4",
  });
}
