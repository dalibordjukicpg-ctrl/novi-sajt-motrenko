import { isSerialized, unserialize } from "php-serialize";

/**
 * WordPress često čuva meta_value kao PHP-serialized string.
 * Vraća primitiv/objekat koji JS može koristiti, ili originalni string.
 */
export function wpMaybeUnserialize(metaValue: string): unknown {
  const raw = metaValue;
  if (typeof raw !== "string") return raw;

  const t = raw.trim();
  if (t.length === 0) return "";

  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      return JSON.parse(t) as unknown;
    } catch {
      /* nije JSON */
    }
  }

  try {
    if (isSerialized(t)) {
      return unserialize(t);
    }
  } catch {
    /* ostavi kao string */
  }

  return raw;
}

/** Skalari i jednostavni objekti kao string za kolone varchar/text. */
export function stringifyMetaForStorage(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
