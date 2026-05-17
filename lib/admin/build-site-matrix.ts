import { asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { siteLocaleStrings } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import {
  SITE_STRING_DEFAULTS,
  SITE_STRING_KEYS,
  type SiteStringKey,
} from "@/lib/site-fields";

export type SiteStringMatrix = Record<SiteStringKey, Record<Locale, string>>;

export async function buildSiteStringMatrix(): Promise<SiteStringMatrix> {
  const matrix = {} as SiteStringMatrix;
  for (const key of SITE_STRING_KEYS) {
    const byLoc = {} as Record<Locale, string>;
    for (const loc of locales) {
      byLoc[loc] = SITE_STRING_DEFAULTS[loc][key];
    }
    matrix[key] = byLoc;
  }
  const rows = await db
    .select({
      fieldKey: siteLocaleStrings.fieldKey,
      locale: siteLocaleStrings.locale,
      value: siteLocaleStrings.value,
    })
    .from(siteLocaleStrings)
    .orderBy(asc(siteLocaleStrings.fieldKey));

  for (const r of rows) {
    const k = r.fieldKey as SiteStringKey;
    const loc = r.locale as Locale;
    if (matrix[k] && loc in matrix[k]) {
      matrix[k][loc] = r.value;
    }
  }
  return matrix;
}
