"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  mediaAltTranslations,
  siteGlobals,
  siteLocaleStrings,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import { z } from "zod";

import {
  SITE_GLOBALS_ROW_ID,
  getSiteGlobalsRow,
} from "@/lib/queries/site-globals";
import { revalidatePublicSite } from "@/lib/revalidate-content";
import {
  SITE_STRING_GROUPS,
  type SiteStringGroupId,
  type SiteStringKey,
} from "@/lib/site-fields";
import { parseSiteStringGroupFromFormData } from "@/lib/validations/site-strings";

function uuidOrNull(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const p = z.string().uuid().safeParse(t);
  if (!p.success) throw new Error("Neispravan ID medija.");
  return p.data;
}

function revalidateAdminContent(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/content/header-footer");
  revalidatePath("/admin/content/hero");
  revalidatePath("/admin/content/sections");
  revalidatePath("/admin/media");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/site");
}

function readGroup(formData: FormData): SiteStringGroupId | null {
  const raw = formData.get("_group");
  if (typeof raw !== "string") return null;
  if (raw in SITE_STRING_GROUPS) return raw as SiteStringGroupId;
  return null;
}

function groupKeys(g: SiteStringGroupId): readonly SiteStringKey[] {
  return SITE_STRING_GROUPS[g] as unknown as readonly SiteStringKey[];
}

export async function saveSiteStringGroupAction(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Niste prijavljeni." };

  const group = readGroup(formData);
  if (!group) return { error: "Nepoznata sekcija sadržaja." };

  const parsed = parseSiteStringGroupFromFormData(group, formData);
  if (!parsed.success) return { error: parsed.error };

  try {
    const keys = groupKeys(group);
    const now = new Date();

    for (const name in parsed.values) {
      const parts = name.split("::");
      if (parts.length !== 2) continue;
      const [locRaw, keyRaw] = parts;
      if (!isLocale(locRaw)) continue;
      const loc = locRaw as Locale;
      const key = keyRaw as SiteStringKey;
      if (!keys.includes(key)) continue;
      const value = parsed.values[name];

      const [existing] = await db
        .select({ id: siteLocaleStrings.id })
        .from(siteLocaleStrings)
        .where(
          and(
            eq(siteLocaleStrings.fieldKey, key),
            eq(siteLocaleStrings.locale, loc),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(siteLocaleStrings)
          .set({ value, updatedAt: now })
          .where(eq(siteLocaleStrings.id, existing.id));
      } else {
        await db.insert(siteLocaleStrings).values({
          id: randomUUID(),
          fieldKey: key,
          locale: loc,
          value,
          updatedAt: now,
        });
      }
    }

    revalidatePublicSite();
    revalidateAdminContent();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { error: "Čuvanje nije uspjelo." };
  }
}

export async function saveSiteGlobalsAction(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Niste prijavljeni." };

  try {
    const cur = await getSiteGlobalsRow();
    const now = new Date();

    const row = {
      logoMediaId: cur?.logoMediaId ?? null,
      faviconMediaId: cur?.faviconMediaId ?? null,
      heroBgMediaId: cur?.heroBgMediaId ?? null,
      analyticsHeadHtml: cur?.analyticsHeadHtml ?? "",
      analyticsBodyHtml: cur?.analyticsBodyHtml ?? "",
      updatedAt: now,
    };

    if (formData.has("logoMediaId")) {
      const v = String(formData.get("logoMediaId") ?? "");
      row.logoMediaId = uuidOrNull(v);
    }
    if (formData.has("faviconMediaId")) {
      const v = String(formData.get("faviconMediaId") ?? "");
      row.faviconMediaId = uuidOrNull(v);
    }
    if (formData.has("heroBgMediaId")) {
      const v = String(formData.get("heroBgMediaId") ?? "");
      row.heroBgMediaId = uuidOrNull(v);
    }
    if (formData.has("analyticsHeadHtml")) {
      row.analyticsHeadHtml = String(formData.get("analyticsHeadHtml") ?? "").slice(
        0,
        50_000,
      );
    }
    if (formData.has("analyticsBodyHtml")) {
      row.analyticsBodyHtml = String(formData.get("analyticsBodyHtml") ?? "").slice(
        0,
        50_000,
      );
    }

    const [globalsExists] = await db
      .select({ id: siteGlobals.id })
      .from(siteGlobals)
      .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID))
      .limit(1);

    if (globalsExists) {
      await db
        .update(siteGlobals)
        .set(row)
        .where(eq(siteGlobals.id, SITE_GLOBALS_ROW_ID));
    } else {
      await db.insert(siteGlobals).values({
        id: SITE_GLOBALS_ROW_ID,
        ...row,
      });
    }

    revalidatePublicSite();
    revalidatePath("/");
    revalidateAdminContent();
    return { ok: true };
  } catch (e) {
    console.error(e);
    const msg =
      e instanceof Error && e.message.includes("Neispravan ID")
        ? e.message
        : "Čuvanje podešavanja nije uspjelo.";
    return { error: msg };
  }
}

/** Za `<form action>` u server komponenti (Next očekuje Promise<void>). */
export async function saveSiteGlobalsFormAction(
  formData: FormData,
): Promise<void> {
  await saveSiteGlobalsAction(formData);
}

const ALT_RE = /^alt::([^:]+)::(me|en|ru|tr)$/;

export async function saveMediaAltTranslationsAction(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Niste prijavljeni." };

  const updates: { mediaId: string; locale: Locale; alt: string }[] = [];

  for (const [k, v] of formData.entries()) {
    if (typeof v !== "string") continue;
    const m = k.match(ALT_RE);
    if (!m) continue;
    const mediaId = m[1];
    const loc = m[2];
    if (!isLocale(loc)) continue;
    if (mediaId.length !== 36) continue;
    const alt = v.slice(0, 512);
    updates.push({ mediaId, locale: loc, alt });
  }

  try {
    for (const u of updates) {
      const [existing] = await db
        .select({ id: mediaAltTranslations.id })
        .from(mediaAltTranslations)
        .where(
          and(
            eq(mediaAltTranslations.mediaId, u.mediaId),
            eq(mediaAltTranslations.locale, u.locale),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(mediaAltTranslations)
          .set({ altText: u.alt })
          .where(eq(mediaAltTranslations.id, existing.id));
      } else {
        await db.insert(mediaAltTranslations).values({
          id: randomUUID(),
          mediaId: u.mediaId,
          locale: u.locale,
          altText: u.alt,
        });
      }
    }

    revalidatePublicSite();
    revalidateAdminContent();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { error: "Čuvanje alt tekstova nije uspjelo." };
  }
}
