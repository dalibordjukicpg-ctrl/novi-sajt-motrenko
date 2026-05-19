"use server";

import { randomUUID } from "crypto";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { canManageAllSiteContent } from "@/lib/auth/content-access";
import { db } from "@/lib/db";
import {
  homeTeamHighlightTranslations,
  homeTeamHighlights,
  sitePageTranslations,
  sitePages,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, locales } from "@/lib/i18n";
import { upsertHighlightTranslation } from "@/lib/queries/home-team-highlights";
import { getSitePageBySlugForAdmin } from "@/lib/queries/site-pages-admin";
import { revalidatePublicSite } from "@/lib/revalidate-content";
import { slugFromTeamHighlightHref } from "@/lib/team-highlight-href";

function revalidateAll() {
  revalidatePublicSite();
  revalidatePath("/admin/content/team");
  revalidatePath("/admin/content/sections");
}

export async function saveTeamHighlightAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const highlightId = String(formData.get("highlightId") ?? "").trim();
  if (!highlightId) return { ok: false, error: "Nedostaje ID kartice." };

  const href = String(formData.get("href") ?? "").trim() || "#";
  const visible = formData.get("visible") === "1";

  await db
    .update(homeTeamHighlights)
    .set({ href: href.slice(0, 512), visible, updatedAt: new Date() })
    .where(eq(homeTeamHighlights.id, highlightId));

  for (const loc of locales) {
    const title = String(formData.get(`title_${loc}`) ?? "").trim();
    const teaser = String(formData.get(`teaser_${loc}`) ?? "").trim() || null;
    await upsertHighlightTranslation(highlightId, loc as Locale, title, teaser);
  }

  revalidateAll();
  return { ok: true };
}

export async function addTeamHighlightAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const [maxRow] = await db
    .select({ maxSort: sql<number>`MAX(sort_order)` })
    .from(homeTeamHighlights);
  const nextSort = ((maxRow?.maxSort ?? 0) as number) + 1;

  const highlightId = randomUUID();
  const now = new Date();

  await db.insert(homeTeamHighlights).values({
    id: highlightId,
    sortOrder: nextSort,
    href: "#",
    visible: true,
    updatedAt: now,
  });

  const titleMe = "Nova kartica";
  for (const loc of locales) {
    await db.insert(homeTeamHighlightTranslations).values({
      id: randomUUID(),
      highlightId,
      locale: loc as Locale,
      title: titleMe,
      teaser: "Kratki opis na kartici.",
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteTeamHighlightAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const highlightId = String(formData.get("highlightId") ?? "").trim();
  if (!highlightId) return { ok: false, error: "Nedostaje ID." };

  await db.delete(homeTeamHighlights).where(eq(homeTeamHighlights.id, highlightId));
  revalidateAll();
  return { ok: true };
}

export async function moveTeamHighlightAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) return;

  const highlightId = String(formData.get("highlightId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "") as "up" | "down";
  if (!highlightId || (direction !== "up" && direction !== "down")) return;

  const [current] = await db
    .select({ id: homeTeamHighlights.id, sortOrder: homeTeamHighlights.sortOrder })
    .from(homeTeamHighlights)
    .where(eq(homeTeamHighlights.id, highlightId))
    .limit(1);
  if (!current) return;

  const neighbor =
    direction === "up"
      ? await db
          .select({ id: homeTeamHighlights.id, sortOrder: homeTeamHighlights.sortOrder })
          .from(homeTeamHighlights)
          .where(lt(homeTeamHighlights.sortOrder, current.sortOrder))
          .orderBy(sql`sort_order DESC`)
          .limit(1)
      : await db
          .select({ id: homeTeamHighlights.id, sortOrder: homeTeamHighlights.sortOrder })
          .from(homeTeamHighlights)
          .where(gt(homeTeamHighlights.sortOrder, current.sortOrder))
          .orderBy(asc(homeTeamHighlights.sortOrder))
          .limit(1);

  const [nbr] = neighbor;
  if (!nbr) return;

  await db
    .update(homeTeamHighlights)
    .set({ sortOrder: nbr.sortOrder })
    .where(eq(homeTeamHighlights.id, current.id));
  await db
    .update(homeTeamHighlights)
    .set({ sortOrder: current.sortOrder })
    .where(eq(homeTeamHighlights.id, nbr.id));

  revalidateAll();
}

function revalidateSitePageSlug(slug: string): void {
  revalidatePublicSite();
  for (const loc of locales) {
    revalidatePath(`/${loc}/s/${slug}`);
  }
}

function pageTitleFromForm(
  formData: FormData,
  loc: Locale,
  titleMe: string,
  slugFallback: string,
): string {
  const key = loc === "me" ? "title_me" : `title_${loc}`;
  const fromForm = String(formData.get(key) ?? "").trim();
  if (loc === defaultLocale) {
    return (fromForm || titleMe || slugFallback).slice(0, 500);
  }
  return (fromForm || titleMe || slugFallback).slice(0, 500);
}

/** Pun sadržaj povezane CMS stranice (Tiptap) — bez redirecta. */
export async function saveTeamHighlightLinkedPageAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const pageId = String(formData.get("pageId") ?? "").trim();
  if (!pageId) return { ok: false, error: "Nedostaje stranica." };

  const [existing] = await db
    .select({
      slug: sitePages.slug,
      published: sitePages.published,
      headerNavGroup: sitePages.headerNavGroup,
    })
    .from(sitePages)
    .where(eq(sitePages.id, pageId))
    .limit(1);
  if (!existing) return { ok: false, error: "Stranica nije pronađena." };

  const titleMe = String(formData.get("title_me") ?? "").trim();

  await db
    .update(sitePages)
    .set({ updatedAt: new Date() })
    .where(eq(sitePages.id, pageId));

  for (const loc of locales) {
    const title = pageTitleFromForm(formData, loc, titleMe, existing.slug);
    const body = String(formData.get(`body_${loc}`) ?? "");
    const bodyVal = body.trim() === "" ? null : body;

    const [tr] = await db
      .select({ id: sitePageTranslations.id })
      .from(sitePageTranslations)
      .where(
        and(
          eq(sitePageTranslations.pageId, pageId),
          eq(sitePageTranslations.locale, loc),
        ),
      )
      .limit(1);

    if (tr) {
      await db
        .update(sitePageTranslations)
        .set({ title: title.slice(0, 500), body: bodyVal })
        .where(eq(sitePageTranslations.id, tr.id));
    } else {
      await db.insert(sitePageTranslations).values({
        id: randomUUID(),
        pageId,
        locale: loc as Locale,
        title: title.slice(0, 500),
        body: bodyVal,
      });
    }
  }

  revalidateSitePageSlug(existing.slug);
  revalidateAll();
  return { ok: true };
}

/** Kreira CMS stranicu za karticu ako slug iz linka još ne postoji. */
export async function createTeamHighlightLinkedPageAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; href?: string }> {
  const session = await getSession();
  if (!session || !canManageAllSiteContent(session.role)) {
    return { ok: false, error: "Nedovoljne privilegije." };
  }

  const highlightId = String(formData.get("highlightId") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const titleMe = String(formData.get("title_me") ?? "").trim() || "Nova stranica";

  if (!slug) {
    const href = String(formData.get("href") ?? "");
    slug = slugFromTeamHighlightHref(href) ?? "";
  }
  if (!slug) {
    return { ok: false, error: "Unesite link (/s/slug) ili slug stranice." };
  }

  const existing = await getSitePageBySlugForAdmin(slug);
  if (existing) {
    const href = `/s/${slug}`;
    if (highlightId) {
      await db
        .update(homeTeamHighlights)
        .set({ href, updatedAt: new Date() })
        .where(eq(homeTeamHighlights.id, highlightId));
      revalidateAll();
    }
    return { ok: true, href };
  }

  const dup = await db
    .select({ id: sitePages.id })
    .from(sitePages)
    .where(eq(sitePages.slug, slug))
    .limit(1);
  if (dup.length > 0) {
    return { ok: false, error: "Slug već postoji." };
  }

  const pageId = randomUUID();
  const now = new Date();
  const placeholderBody = `<p><em>Zamijenite ovaj tekst — dodajte pasuse, podnaslove i slike.</em></p>`;

  await db.insert(sitePages).values({
    id: pageId,
    slug,
    headerNavGroup: null,
    published: true,
    createdAt: now,
    updatedAt: now,
  });

  for (const loc of locales) {
    const title =
      loc === defaultLocale
        ? titleMe
        : titleMe;
    await db.insert(sitePageTranslations).values({
      id: randomUUID(),
      pageId,
      locale: loc as Locale,
      title: title.slice(0, 500),
      body: placeholderBody,
    });
  }

  const href = `/s/${slug}`;
  if (highlightId) {
    await db
      .update(homeTeamHighlights)
      .set({ href, updatedAt: new Date() })
      .where(eq(homeTeamHighlights.id, highlightId));
  }

  revalidateSitePageSlug(slug);
  revalidateAll();
  return { ok: true, href };
}
