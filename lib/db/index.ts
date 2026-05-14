import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { getDatabaseUrl } from "@/lib/database-url";

import * as schema from "./schema";

const globalForPool = globalThis as typeof globalThis & {
  __dbPool?: mysql.Pool;
  __drizzle?: MySql2Database<typeof schema>;
};

function getPool(): mysql.Pool {
  const url = getDatabaseUrl();
  if (!globalForPool.__dbPool) {
    globalForPool.__dbPool = mysql.createPool(url);
  }
  return globalForPool.__dbPool;
}

function getDrizzle(): MySql2Database<typeof schema> {
  if (!globalForPool.__drizzle) {
    globalForPool.__drizzle = drizzle(getPool(), {
      schema,
      mode: "default",
    });
  }
  return globalForPool.__drizzle;
}

/**
 * Lazy init: ne zovi getDatabaseUrl/createPool pri samom importu modula.
 * Tako root layout i redirect mogu proći čak i ako se db kasno učitava.
 */
export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDrizzle();
    const value = Reflect.get(instance as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});
