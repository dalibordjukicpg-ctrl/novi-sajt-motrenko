"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminPath } from "@/lib/admin-base-path";
import { assertContentMutationAllowed, canManageAllSiteContent } from "@/lib/auth/content-access";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sitePageTranslations, sitePages } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, locales } from "@/lib/i18n";
import { revalidatePublicSite } from "@/lib/revalidate-content";
import { SITE_PAGE_HEADER_GROUP_OPTIONS } from "@/lib/site-page-header-nav";
import { slugifyTitle } from "@/lib/slugify";

function parseHeaderNavGroup(formData: FormData): string | null {
  const raw = String(formData.get("header_nav_group") ?? "").trim();
  const allowed = new Set(
    SITE_PAGE_HEADER_GROUP_OPTIONS.map((o) => o.value).filter(Boolean),
  );
  return raw && allowed.has(raw) ? raw : null;
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

function revalidateSitePage(slug: string): void {
  revalidatePublicSite();
  for (const loc of locales) {
    revalidatePath(`/${loc}/s/${slug}`);
  }
}

export async function createSitePageAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const createGate = await assertContentMutationAllowed(
    session,
    "site_page",
    undefined,
    "create",
  );
  if (!createGate.ok) {
    redirect(`${adminPath("pages/new")}?error=forbidden`);
  }

  let slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const titleMe = String(formData.get("title_me") ?? "").trim();
  if (!slug && titleMe) slug = slugifyTitle(titleMe);
  if (!slug) return;

  const dup = await db
    .select({ id: sitePages.id })
    .from(sitePages)
    .where(eq(sitePages.slug, slug))
    .limit(1);
  if (dup.length > 0) {
    redirect(`${adminPath("pages/new")}?error=slug`);
  }

  const published = formData.get("published") === "on";
  const headerNavGroup = parseHeaderNavGroup(formData);
  const pageId = randomUUID();
  const now = new Date();

  await db.insert(sitePages).values({
    id: pageId,
    slug,
    headerNavGroup,
    published,
    createdAt: now,
    updatedAt: now,
  });

  for (const loc of locales) {
    const title = pageTitleFromForm(formData, loc, titleMe, slug);
    const body = String(formData.get(`body_${loc}`) ?? "");
    await db.insert(sitePageTranslations).values({
      id: randomUUID(),
      pageId,
      locale: loc as Locale,
      title: title.slice(0, 500),
      body: body.trim() === "" ? null : body,
    });
  }

  revalidateSitePage(slug);
  revalidatePath("/admin/pages");
  redirect(`${adminPath(`pages/${pageId}/edit`)}?created=1`);
}

export async function updateSitePageAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const pageId = String(formData.get("pageId") ?? "");
  if (!pageId) return;

  const gate = await assertContentMutationAllowed(
    session,
    "site_page",
    pageId,
    "update",
  );
  if (!gate.ok) {
    redirect(`${adminPath(`pages/${pageId}/edit`)}?error=forbidden`);
  }

  const [existing] = await db
    .select({ slug: sitePages.slug })
    .from(sitePages)
    .where(eq(sitePages.id, pageId))
    .limit(1);
  if (!existing) return;

  let newSlug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!newSlug) newSlug = existing.slug;

  if (newSlug !== existing.slug) {
    const dup = await db
      .select({ id: sitePages.id })
      .from(sitePages)
      .where(eq(sitePages.slug, newSlug))
      .limit(1);
    if (dup.length > 0) {
      redirect(`${adminPath(`pages/${pageId}/edit`)}?error=slug`);
    }
  }

  const published = formData.get("published") === "on";
  const titleMe = String(formData.get("title_me") ?? "").trim();
  const headerNavGroup = parseHeaderNavGroup(formData);

  await db
    .update(sitePages)
    .set({
      slug: newSlug,
      published,
      headerNavGroup,
      updatedAt: new Date(),
    })
    .where(eq(sitePages.id, pageId));

  for (const loc of locales) {
    const title = pageTitleFromForm(formData, loc, titleMe, newSlug);
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
        .set({
          title: title.slice(0, 500),
          body: bodyVal,
        })
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

  revalidateSitePage(existing.slug);
  if (newSlug !== existing.slug) {
    revalidateSitePage(newSlug);
  }
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}/edit`);
  redirect(`${adminPath(`pages/${pageId}/edit`)}?saved=1`);
}

export async function deleteSitePageAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const pageId = String(formData.get("pageId") ?? "");
  if (!pageId) return;

  if (!canManageAllSiteContent(session.role)) {
    redirect(`${adminPath("pages")}?error=forbidden`);
  }

  const [row] = await db
    .select({ slug: sitePages.slug })
    .from(sitePages)
    .where(eq(sitePages.id, pageId))
    .limit(1);
  if (!row) return;
  await db.delete(sitePages).where(eq(sitePages.id, pageId));
  revalidateSitePage(row.slug);
  revalidatePath("/admin/pages");
  redirect(`${adminPath("pages")}?deleted=1`);
}
