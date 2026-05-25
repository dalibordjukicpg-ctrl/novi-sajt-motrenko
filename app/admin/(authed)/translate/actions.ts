"use server";

import { randomUUID } from "crypto";
import { and, desc, eq, inArray, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertContentMutationAllowed, getSession, hasPermission, PERMISSIONS, writeAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  homeTeamHighlightTranslations,
  homeTeamHighlights,
  navLinkTranslations,
  navLinks,
  postTranslations,
  posts,
  siteLocaleStrings,
  sitePageTranslations,
  sitePages,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, locales } from "@/lib/i18n";
import { upsertHighlightTranslation } from "@/lib/queries/home-team-highlights";
import { getSitePageBySlugForAdmin, getSitePageForAdmin, listSitePagesForAdmin } from "@/lib/queries/site-pages-admin";
import { revalidateArticlePaths, revalidatePublicSite } from "@/lib/revalidate-content";
import { slugFromTeamHighlightHref } from "@/lib/team-highlight-href";
import { slugifyTitle } from "@/lib/slugify";
import {
  getTranslateConfigError,
  getTranslateProvider,
  isNonTranslatableStringValue,
  machineTranslateHtml,
  machineTranslatePlain,
  machineTranslateTexts,
  type MachineTranslateTarget,
} from "@/lib/machine-translate";
import { needsRuntimeTranslation } from "@/lib/runtime-translate";
import {
  computeTranslationSourceHash,
  markTranslationFailed,
  markTranslationSuccess,
  type TargetLocale,
} from "@/lib/translation-records";
import { TRANSLATION_BATCH_SIZE } from "@/lib/translation-config";
import {
  entityNeedsAnyTranslation,
  localesNeedingNavTranslation,
  localesNeedingPageTranslation,
  localesNeedingPostTranslation,
} from "@/lib/translation-missing";
import type { SiteStringKey } from "@/lib/site-fields";
import { SITE_STRING_DEFAULTS, SITE_STRING_KEYS } from "@/lib/site-fields";
import type { ArticleFormValues } from "@/lib/validations/article";


export type TranslateOptions = {
  /** Preskoči locale koji već imaju validan prevod u bazi. */
  onlyMissing?: boolean;
};

export type TranslateLabelsResult =
  | { ok: true; translations: Record<MachineTranslateTarget, string> }
  | { ok: false; error: string };

type ArticleLocaleBlock = ArticleFormValues["me"];

export type TranslateArticleResult =
  | { ok: true; en: ArticleLocaleBlock; ru: ArticleLocaleBlock }
  | { ok: false; error: string };

export type TranslateSiteStringsResult =
  | {
      ok: true;
      translations: Record<
        Exclude<Locale, "me">,
        Partial<Record<SiteStringKey, string>>
      >;
    }
  | { ok: false; error: string };

async function gateContentManage(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Niste prijavljeni." };
  if (!hasPermission(session.role, PERMISSIONS.SITE_CONTENT_MANAGE)) {
    return { ok: false, error: "Nemate dozvolu." };
  }
  return { ok: true };
}

/** Da admin vidi da li je OpenAI/Azure podešen prije klika. */
export async function getTranslateSetupStatusAction(): Promise<{
  ready: boolean;
  provider: string | null;
  hint: string | null;
}> {
  const gate = await gateContentManage();
  if (!gate.ok) return { ready: false, provider: null, hint: gate.error };

  const provider = getTranslateProvider();
  if (!provider) {
    return {
      ready: false,
      provider: null,
      hint:
        getTranslateConfigError() ??
        "U .env postavi TRANSLATE_PROVIDER=openai i OPENAI_API_KEY, pa restartuj npm run dev.",
    };
  }
  return { ready: true, provider, hint: null };
}

async function translateArticleBlock(
  me: ArticleLocaleBlock,
  target: MachineTranslateTarget,
): Promise<ArticleLocaleBlock> {
  const [title, excerpt, metaTitle, metaDescription] = await machineTranslateTexts(
    [
      me.title,
      me.excerpt ?? "",
      me.metaTitle ?? "",
      me.metaDescription ?? "",
    ],
    target,
  );

  let bodyOut = "";
  const rawBody = me.body ?? "";
  if (rawBody.trim().length > 0) {
    bodyOut = rawBody.includes("<")
      ? await machineTranslateHtml(rawBody, target)
      : await machineTranslatePlain(rawBody, target);
  }

  const slugSource = title.trim() || me.slug.trim() || "clanak";
  const slug = slugifyTitle(slugSource) || me.slug.trim() || "clanak";

  return {
    slug,
    title: title.trim(),
    excerpt: excerpt.trim(),
    body: bodyOut,
    metaTitle: metaTitle.trim(),
    metaDescription: metaDescription.trim(),
  };
}

/** Popuni EN i RU polja članka iz ME bloka (DeepL). */
export async function translateArticleFromMeAction(
  me: ArticleLocaleBlock,
): Promise<TranslateArticleResult> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const hasTitle = me.title.trim().length > 0;
  const hasBody = (me.body ?? "").trim().length > 0;
  if (!hasTitle && !hasBody) {
    return {
      ok: false,
      error: "Unesite naslov ili sadržaj na ME/SR prije generisanja prevoda.",
    };
  }

  try {
    const [en, ru] = await Promise.all([
      translateArticleBlock(me, "en"),
      translateArticleBlock(me, "ru"),
    ]);
    return { ok: true, en, ru };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generisanje prevoda nije uspjelo.",
    };
  }
}

const HREF_LIKE_KEYS = new Set<SiteStringKey>([
  "header.cta_book_href",
  "header.nav_search_href",
  "hero.cta_primary_href",
  "hero.cta_secondary_href",
  "social.facebook",
  "social.instagram",
  "social.youtube",
  "social.linkedin",
]);

/** Grupa site stringova: ME → EN i RU (samo proslijeđeni ključevi). */
export async function translateSiteStringsFromMeAction(
  meValues: Partial<Record<SiteStringKey, string>>,
): Promise<TranslateSiteStringsResult> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const keys = (Object.keys(meValues) as SiteStringKey[]).filter((k) =>
    SITE_STRING_KEYS.includes(k),
  );
  if (keys.length === 0) {
    return { ok: false, error: "Nema tekstova za prevod." };
  }

  const targets = locales.filter(
    (l): l is MachineTranslateTarget => l !== defaultLocale,
  );

  const translations: Record<
    MachineTranslateTarget,
    Partial<Record<SiteStringKey, string>>
  > = { en: {}, ru: {} };

  try {
    for (const target of targets) {
      const toTranslate: string[] = [];
      const translateKeys: SiteStringKey[] = [];

      for (const key of keys) {
        const raw = (meValues[key] ?? "").trim();
        if (HREF_LIKE_KEYS.has(key) || isNonTranslatableStringValue(raw)) {
          translations[target][key] = meValues[key] ?? "";
          continue;
        }
        if (!raw) {
          translations[target][key] = "";
          continue;
        }
        translateKeys.push(key);
        toTranslate.push(raw);
      }

      if (toTranslate.length > 0) {
        const translated = await machineTranslateTexts(toTranslate, target);
        for (let i = 0; i < translateKeys.length; i++) {
          translations[target][translateKeys[i]!] = translated[i] ?? "";
        }
      }
    }

    return { ok: true, translations };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generisanje prevoda nije uspjelo.",
    };
  }
}

export type TranslatePageLocalesResult =
  | {
      ok: true;
      translations: Record<
        MachineTranslateTarget,
        { title: string; body: string }
      >;
    }
  | { ok: false; error: string };

async function translateSitePageBlock(
  input: { title: string; body: string },
  target: MachineTranslateTarget,
): Promise<{ title: string; body: string }> {
  const titleSrc = input.title.trim();
  const bodySrc = input.body.trim();

  const [title, body] = await Promise.all([
    titleSrc
      ? machineTranslatePlain(titleSrc, target)
      : Promise.resolve(""),
    bodySrc
      ? machineTranslateHtml(bodySrc, target)
      : Promise.resolve(""),
  ]);

  return { title: title.trim(), body };
}

/** CMS stranica: naslov + HTML tijelo ME → EN i/ili RU. */
export async function translateSitePageFromMeAction(input: {
  title: string;
  body: string;
  targetLocales?: TargetLocale[];
}): Promise<TranslatePageLocalesResult> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title && !body) {
    return {
      ok: false,
      error: "Unesite naslov ili sadržaj na ME/SR prije prijevoda.",
    };
  }

  const targets = input.targetLocales ?? (["en", "ru"] as const);

  try {
    const translations: Record<
      MachineTranslateTarget,
      { title: string; body: string }
    > = {
      en: { title: "", body: "" },
      ru: { title: "", body: "" },
    };

    await Promise.all(
      targets.map(async (loc) => {
        translations[loc] = await translateSitePageBlock(input, loc);
      }),
    );

    return {
      ok: true,
      translations,
    };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generisanje prevoda nije uspjelo.",
    };
  }
}

export type TranslateSaveSitePageResult =
  | { ok: true; pageId: string; slug: string }
  | { ok: false; error: string };

function revalidateSitePageSlug(slug: string): void {
  revalidatePublicSite();
  for (const loc of locales) {
    revalidatePath(`/${loc}/s/${slug}`);
  }
  revalidatePath("/admin/pages");
}

async function persistSitePageEnRuTranslations(
  pageId: string,
  slug: string,
  translations: Record<MachineTranslateTarget, { title: string; body: string }>,
  meSource: { title: string; body: string },
  localesToPersist?: TargetLocale[],
): Promise<TranslateSaveSitePageResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Niste prijavljeni." };

  const gate = await assertContentMutationAllowed(
    session,
    "site_page",
    pageId,
    "update",
  );
  if (!gate.ok) return { ok: false, error: gate.error };

  const sourceHash = computeTranslationSourceHash([meSource.title, meSource.body]);
  const persistLocales = localesToPersist ?? (["en", "ru"] as const);

  for (const loc of persistLocales) {
    const block = translations[loc];
    if (!block || (!block.title.trim() && !block.body.trim())) continue;
    const title = block.title.trim().slice(0, 500);
    const bodyVal = block.body.trim() === "" ? null : block.body;

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
        .set({ title, body: bodyVal })
        .where(eq(sitePageTranslations.id, tr.id));
    } else {
      await db.insert(sitePageTranslations).values({
        id: randomUUID(),
        pageId,
        locale: loc,
        title,
        body: bodyVal,
      });
    }

    await markTranslationSuccess({
      entityType: "site_page",
      entityId: pageId,
      targetLocale: loc,
      sourceHash,
    });
  }

  await db
    .update(sitePages)
    .set({ updatedAt: new Date() })
    .where(eq(sitePages.id, pageId));

  revalidateSitePageSlug(slug);
  revalidatePath(`/admin/pages/${pageId}/edit`);

  return { ok: true, pageId, slug };
}

/** CMS stranica po ID: ME → EN/RU i upis u bazu (lista stranica). */
export async function translateAndSaveSitePageByIdAction(
  pageId: string,
  options?: TranslateOptions,
): Promise<TranslateSaveSitePageResult & { skipped?: boolean }> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const page = await getSitePageForAdmin(pageId);
  if (!page) return { ok: false, error: "Stranica nije pronađena." };

  const title = page.byLocale[defaultLocale].title.trim();
  const body = page.byLocale[defaultLocale].body.trim();
  if (!title && !body) {
    return {
      ok: false,
      error: "Nema naslova ni sadržaja na ME/SR.",
    };
  }

  const meSource = { title, body };
  let targetLocales: TargetLocale[] = ["en", "ru"];

  if (options?.onlyMissing) {
    const existingRows = await db
      .select({
        locale: sitePageTranslations.locale,
        title: sitePageTranslations.title,
        body: sitePageTranslations.body,
      })
      .from(sitePageTranslations)
      .where(
        and(
          eq(sitePageTranslations.pageId, pageId),
          inArray(sitePageTranslations.locale, ["en", "ru"]),
        ),
      );

    const existing: Partial<
      Record<TargetLocale, { title: string; body: string }>
    > = {};
    for (const row of existingRows) {
      if (row.locale === "en" || row.locale === "ru") {
        existing[row.locale] = {
          title: strOrEmpty(row.title),
          body: strOrEmpty(row.body),
        };
      }
    }

    targetLocales = localesNeedingPageTranslation(meSource, existing);
    if (!entityNeedsAnyTranslation(targetLocales)) {
      return { ok: true, pageId, slug: page.slug, skipped: true };
    }
  }

  try {
    const translated = await translateSitePageFromMeAction({
      title,
      body,
      targetLocales,
    });
    if (!translated.ok) {
      const sourceHash = computeTranslationSourceHash([title, body]);
      for (const loc of targetLocales) {
        await markTranslationFailed({
          entityType: "site_page",
          entityId: pageId,
          targetLocale: loc,
          sourceHash,
          errorMessage: translated.error,
        });
      }
      return translated;
    }

    return persistSitePageEnRuTranslations(
      pageId,
      page.slug,
      translated.translations,
      meSource,
      targetLocales,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generisanje prevoda nije uspjelo.";
    const sourceHash = computeTranslationSourceHash([title, body]);
    for (const loc of targetLocales) {
      await markTranslationFailed({
        entityType: "site_page",
        entityId: pageId,
        targetLocale: loc,
        sourceHash,
        errorMessage: msg,
      });
    }
    return { ok: false, error: msg };
  }
}

export type TranslateSaveAllSitePagesResult = {
  ok: boolean;
  total: number;
  succeeded: number;
  failed: { pageId: string; titleMe: string; error: string }[];
};

/** Sve CMS stranice redom: ME → EN/RU i sačuvaj. */
export async function translateAndSaveAllSitePagesAction(): Promise<TranslateSaveAllSitePagesResult> {
  const gate = await gateContentManage();
  if (!gate.ok) {
    return { ok: false, total: 0, succeeded: 0, failed: [] };
  }

  const pages = await listSitePagesForAdmin();
  const failed: TranslateSaveAllSitePagesResult["failed"] = [];
  let succeeded = 0;

  for (const p of pages) {
    const res = await translateAndSaveSitePageByIdAction(p.id);
    if (res.ok) {
      succeeded += 1;
    } else {
      failed.push({
        pageId: p.id,
        titleMe: p.titleMe,
        error: res.error,
      });
    }
  }

  revalidatePath("/admin/pages");

  return {
    ok: failed.length === 0,
    total: pages.length,
    succeeded,
    failed,
  };
}

/* ============================================================
 *  Centralni batch prevod ("Prevodi" sekcija u adminu).
 *  Klijent pokreće akciju po jedinici (radi prikaza progresa).
 * ============================================================ */

export type TranslateUnit = {
  id: string;
  label: string;
};

export type TranslateCategoryKey =
  | "cmsPages"
  | "blogPosts"
  | "teamPosts"
  | "navLinks"
  | "siteStrings";

export type TranslateInventory = {
  cmsPages: TranslateUnit[];
  blogPosts: TranslateUnit[];
  teamPosts: TranslateUnit[];
  navLinks: TranslateUnit[];
  /** Skup site stringova se prevodi u jednom potezu, ali znamo koliko ih je. */
  siteStrings: { totalWithContent: number; missingAny: boolean };
  /** Podskupovi koji nemaju EN ili RU prevod — za „samo nedostajući“ mod. */
  missing: {
    cmsPages: TranslateUnit[];
    blogPosts: TranslateUnit[];
    teamPosts: TranslateUnit[];
    navLinks: TranslateUnit[];
  };
  stats: {
    totalUnits: number;
    completeUnits: number;
    missingUnits: number;
  };
};

/** Sve jedinice prevoda po kategorijama (za UI i progres). */
export async function getTranslateInventoryAction(): Promise<TranslateInventory> {
  const empty: TranslateInventory = {
    cmsPages: [],
    blogPosts: [],
    teamPosts: [],
    navLinks: [],
    siteStrings: { totalWithContent: 0, missingAny: false },
    missing: { cmsPages: [], blogPosts: [], teamPosts: [], navLinks: [] },
    stats: { totalUnits: 0, completeUnits: 0, missingUnits: 0 },
  };

  const gate = await gateContentManage();
  if (!gate.ok) return empty;

  const pages = await db
    .select({
      id: sitePages.id,
      title: sitePageTranslations.title,
    })
    .from(sitePages)
    .innerJoin(
      sitePageTranslations,
      and(
        eq(sitePageTranslations.pageId, sitePages.id),
        eq(sitePageTranslations.locale, defaultLocale),
      ),
    );

  const allPosts = await db
    .select({
      id: posts.id,
      contentRole: posts.contentRole,
      title: postTranslations.title,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .leftJoin(
      postTranslations,
      and(
        eq(postTranslations.postId, posts.id),
        eq(postTranslations.locale, defaultLocale),
      ),
    )
    .orderBy(desc(posts.updatedAt));

  const navRows = await db
    .select({
      id: navLinks.id,
      label: navLinkTranslations.label,
      href: navLinks.href,
    })
    .from(navLinks)
    .leftJoin(
      navLinkTranslations,
      and(
        eq(navLinkTranslations.navLinkId, navLinks.id),
        eq(navLinkTranslations.locale, defaultLocale),
      ),
    );

  const pageTrRows = await db
    .select({
      pageId: sitePageTranslations.pageId,
      locale: sitePageTranslations.locale,
      title: sitePageTranslations.title,
      body: sitePageTranslations.body,
    })
    .from(sitePageTranslations)
    .where(inArray(sitePageTranslations.locale, ["me", "en", "ru"]));

  const postTrRows = await db
    .select({
      postId: postTranslations.postId,
      locale: postTranslations.locale,
      title: postTranslations.title,
      body: postTranslations.body,
      excerpt: postTranslations.excerpt,
    })
    .from(postTranslations)
    .where(inArray(postTranslations.locale, ["me", "en", "ru"]));

  const navTrRows = await db
    .select({
      navLinkId: navLinkTranslations.navLinkId,
      locale: navLinkTranslations.locale,
      label: navLinkTranslations.label,
    })
    .from(navLinkTranslations)
    .where(inArray(navLinkTranslations.locale, ["me", "en", "ru"]));

  type PageTr = { title: string; body: string };
  const pageById = new Map<string, Partial<Record<Locale, PageTr>>>();
  for (const row of pageTrRows) {
    const map = pageById.get(row.pageId) ?? {};
    map[row.locale] = {
      title: strOrEmpty(row.title),
      body: strOrEmpty(row.body),
    };
    pageById.set(row.pageId, map);
  }

  type PostTr = { title: string; body: string; excerpt: string };
  const postById = new Map<string, Partial<Record<Locale, PostTr>>>();
  for (const row of postTrRows) {
    const map = postById.get(row.postId) ?? {};
    map[row.locale] = {
      title: strOrEmpty(row.title),
      body: strOrEmpty(row.body),
      excerpt: strOrEmpty(row.excerpt),
    };
    postById.set(row.postId, map);
  }

  const navById = new Map<string, Partial<Record<Locale, { label: string }>>>();
  for (const row of navTrRows) {
    const map = navById.get(row.navLinkId) ?? {};
    map[row.locale] = { label: strOrEmpty(row.label) };
    navById.set(row.navLinkId, map);
  }

  function isPageMissing(pageId: string): boolean {
    const tr = pageById.get(pageId);
    const me = tr?.me;
    if (!me || (!me.title.trim() && !me.body.trim())) return false;
    return entityNeedsAnyTranslation(
      localesNeedingPageTranslation(me, { en: tr?.en, ru: tr?.ru }),
    );
  }

  function isPostMissing(postId: string): boolean {
    const tr = postById.get(postId);
    const me = tr?.me;
    if (!me || (!me.title.trim() && !me.body.trim())) return false;
    return entityNeedsAnyTranslation(
      localesNeedingPostTranslation(me, { en: tr?.en, ru: tr?.ru }),
    );
  }

  function isNavMissing(navLinkId: string): boolean {
    const tr = navById.get(navLinkId);
    const meLabel = tr?.me?.label.trim() ?? "";
    if (!meLabel) return false;
    return entityNeedsAnyTranslation(
      localesNeedingNavTranslation(meLabel, { en: tr?.en, ru: tr?.ru }),
    );
  }

  const meDefaultsForCount = SITE_STRING_DEFAULTS[defaultLocale];
  const meStringValues = new Map<SiteStringKey, string>();
  for (const key of SITE_STRING_KEYS) {
    const v = (meDefaultsForCount[key] ?? "").toString();
    if (v.trim() !== "") meStringValues.set(key, v);
  }

  const meRowsForCount = await db
    .select({
      fieldKey: siteLocaleStrings.fieldKey,
      value: siteLocaleStrings.value,
    })
    .from(siteLocaleStrings)
    .where(eq(siteLocaleStrings.locale, defaultLocale));

  for (const r of meRowsForCount) {
    const key = r.fieldKey as SiteStringKey;
    if (!SITE_STRING_KEYS.includes(key)) continue;
    const v = (r.value ?? "").toString();
    if (v.trim() !== "") meStringValues.set(key, v);
  }

  const localizedStringRows = await db
    .select({
      fieldKey: siteLocaleStrings.fieldKey,
      locale: siteLocaleStrings.locale,
      value: siteLocaleStrings.value,
    })
    .from(siteLocaleStrings)
    .where(inArray(siteLocaleStrings.locale, ["en", "ru"]));

  const enStrings = new Map<string, string>();
  const ruStrings = new Map<string, string>();
  for (const row of localizedStringRows) {
    const v = (row.value ?? "").toString();
    if (row.locale === "en") enStrings.set(row.fieldKey, v);
    if (row.locale === "ru") ruStrings.set(row.fieldKey, v);
  }

  let meStringsCount = 0;
  let siteStringsMissingAny = false;
  for (const [key, value] of meStringValues) {
    if (HREF_LIKE_KEYS.has(key)) continue;
    if (isNonTranslatableStringValue(value)) continue;
    meStringsCount += 1;
    if (
      needsRuntimeTranslation(enStrings.get(key), value) ||
      needsRuntimeTranslation(ruStrings.get(key), value)
    ) {
      siteStringsMissingAny = true;
    }
  }

  const allCmsPages = pages.map((p) => ({ id: p.id, label: p.title ?? "(bez naslova)" }));
  const allBlogPosts = allPosts
    .filter((p) => p.contentRole === "blog")
    .map((p) => ({ id: p.id, label: p.title ?? "(bez naslova)" }));
  const allTeamPosts = allPosts
    .filter((p) => p.contentRole === "team")
    .map((p) => ({ id: p.id, label: p.title ?? "(bez naslova)" }));
  const allNavLinks = navRows.map((n) => ({
    id: n.id,
    label: (n.label && n.label.trim()) || n.href || "(bez naziva)",
  }));

  const missingCms = allCmsPages.filter((p) => isPageMissing(p.id));
  const missingBlog = allBlogPosts.filter((p) => isPostMissing(p.id));
  const missingTeam = allTeamPosts.filter((p) => isPostMissing(p.id));
  const missingNav = allNavLinks.filter((n) => isNavMissing(n.id));

  const siteStringsUnit =
    meStringsCount > 0 && siteStringsMissingAny ? 1 : 0;
  const totalUnits =
    allCmsPages.length +
    allBlogPosts.length +
    allTeamPosts.length +
    allNavLinks.length +
    (meStringsCount > 0 ? 1 : 0);
  const missingUnits =
    missingCms.length +
    missingBlog.length +
    missingTeam.length +
    missingNav.length +
    siteStringsUnit;

  return {
    cmsPages: allCmsPages,
    blogPosts: allBlogPosts,
    teamPosts: allTeamPosts,
    navLinks: allNavLinks,
    siteStrings: {
      totalWithContent: meStringsCount,
      missingAny: siteStringsMissingAny,
    },
    missing: {
      cmsPages: missingCms,
      blogPosts: missingBlog,
      teamPosts: missingTeam,
      navLinks: missingNav,
    },
    stats: {
      totalUnits,
      completeUnits: Math.max(0, totalUnits - missingUnits),
      missingUnits,
    },
  };
}

/* ===== POSTS ===== */

export type TranslateSavePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

function strOrEmpty(v: string | null | undefined): string {
  return (v ?? "").toString();
}

/** Jedan članak (blog/tim): ME → EN/RU i upis u bazu. */
export async function translateAndSavePostByIdAction(
  postId: string,
  options?: TranslateOptions,
): Promise<TranslateSavePostResult & { skipped?: boolean }> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const session = await getSession();
  if (!session) return { ok: false, error: "Niste prijavljeni." };

  const mutGate = await assertContentMutationAllowed(
    session,
    "post",
    postId,
    "update",
  );
  if (!mutGate.ok) return { ok: false, error: mutGate.error };

  const [postRow] = await db
    .select({
      id: posts.id,
      contentRole: posts.contentRole,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!postRow) return { ok: false, error: "Članak nije pronađen." };

  const [meRow] = await db
    .select()
    .from(postTranslations)
    .where(
      and(
        eq(postTranslations.postId, postId),
        eq(postTranslations.locale, defaultLocale),
      ),
    )
    .limit(1);

  if (!meRow) {
    return { ok: false, error: "Nema ME/SR sadržaja za prevod." };
  }

  const meBlock: ArticleLocaleBlock = {
    slug: strOrEmpty(meRow.slug).trim(),
    title: strOrEmpty(meRow.title).trim(),
    excerpt: strOrEmpty(meRow.excerpt),
    body: strOrEmpty(meRow.body),
    metaTitle: strOrEmpty(meRow.metaTitle),
    metaDescription: strOrEmpty(meRow.metaDescription),
  };

  if (!meBlock.title.trim() && !(meBlock.body ?? "").trim()) {
    return { ok: false, error: "Prazan ME/SR sadržaj." };
  }

  const meForCheck = {
    title: meBlock.title,
    body: meBlock.body ?? "",
    excerpt: meBlock.excerpt ?? "",
  };
  const sourceHash = computeTranslationSourceHash([
    meBlock.title,
    meBlock.excerpt,
    meBlock.body,
  ]);

  let targetLocales: TargetLocale[] = ["en", "ru"];
  if (options?.onlyMissing) {
    const existingRows = await db
      .select({
        locale: postTranslations.locale,
        title: postTranslations.title,
        body: postTranslations.body,
        excerpt: postTranslations.excerpt,
      })
      .from(postTranslations)
      .where(
        and(
          eq(postTranslations.postId, postId),
          inArray(postTranslations.locale, ["en", "ru"]),
        ),
      );

    const existing: Partial<
      Record<TargetLocale, { title: string; body: string; excerpt: string }>
    > = {};
    for (const row of existingRows) {
      if (row.locale === "en" || row.locale === "ru") {
        existing[row.locale] = {
          title: strOrEmpty(row.title),
          body: strOrEmpty(row.body),
          excerpt: strOrEmpty(row.excerpt),
        };
      }
    }

    targetLocales = localesNeedingPostTranslation(meForCheck, existing);
    if (!entityNeedsAnyTranslation(targetLocales)) {
      return { ok: true, postId, skipped: true };
    }
  }

  try {
    const translatedBlocks = await Promise.all(
      targetLocales.map(async (loc) => ({
        loc,
        block: await translateArticleBlock(meBlock, loc),
      })),
    );

    for (const { loc, block } of translatedBlocks) {
      const baseSlug = block.slug.trim() || meBlock.slug.trim() || "clanak";
      const safeSlug = `${slugifyTitle(baseSlug) || baseSlug}-${loc}`;
      const finalSlug = (block.slug.trim() || safeSlug).slice(0, 255);

      const [existing] = await db
        .select({ id: postTranslations.id })
        .from(postTranslations)
        .where(
          and(
            eq(postTranslations.postId, postId),
            eq(postTranslations.locale, loc),
          ),
        )
        .limit(1);

      const values = {
        slug: finalSlug,
        title: block.title.slice(0, 500),
        excerpt: block.excerpt?.trim() ? block.excerpt : null,
        body: block.body?.trim() ? block.body : null,
        metaTitle: block.metaTitle?.trim()
          ? block.metaTitle.slice(0, 255)
          : null,
        metaDescription: block.metaDescription?.trim()
          ? block.metaDescription.slice(0, 512)
          : null,
      };

      if (existing) {
        await db
          .update(postTranslations)
          .set(values)
          .where(eq(postTranslations.id, existing.id));
      } else {
        await db.insert(postTranslations).values({
          id: randomUUID(),
          postId,
          locale: loc,
          ...values,
        });
      }

      await markTranslationSuccess({
        entityType: "post",
        entityId: postId,
        targetLocale: loc,
        sourceHash,
      });
    }

    await db
      .update(posts)
      .set({ updatedAt: new Date() })
      .where(eq(posts.id, postId));

    revalidatePublicSite();
    revalidatePath("/admin/posts");
    revalidatePath(`/admin/posts/${postId}/edit`);
    for (const loc of locales) {
      let slugForLoc = meBlock.slug.trim();
      if (loc === "en" || loc === "ru") {
        const hit = translatedBlocks.find((t) => t.loc === loc);
        if (hit) slugForLoc = hit.block.slug.trim();
      }
      if (slugForLoc) {
        revalidatePath(`/${loc}/posts/${slugForLoc}`);
      }
    }

    return { ok: true, postId };
  } catch (e) {
    console.error("[translateAndSavePostByIdAction]", e);
    const msg = e instanceof Error ? e.message : "Prevod članka nije uspio.";
    for (const loc of targetLocales) {
      await markTranslationFailed({
        entityType: "post",
        entityId: postId,
        targetLocale: loc,
        sourceHash,
        errorMessage: msg,
      });
    }
    return { ok: false, error: msg };
  }
}

/* ===== NAV LINKS ===== */

export type TranslateSaveNavLinkResult =
  | { ok: true; navLinkId: string }
  | { ok: false; error: string };

/** Prevod kratke labele s validacijom kvaliteta i jednim retry-em za RU/EN. */
async function translateNavLabelWithRetry(
  meLabel: string,
  target: MachineTranslateTarget,
): Promise<string> {
  function isUsable(candidate: string): boolean {
    const c = candidate.trim();
    if (!c) return false;
    if (c.toLowerCase() === meLabel.toLowerCase()) return false;
    if (target === "ru" && !/[\u0400-\u04FF]/.test(c)) return false;
    return true;
  }

  // 1. pokušaj — single string
  const first = await machineTranslateTexts([meLabel], target).then(
    (r) => r[0] ?? "",
  );
  if (isUsable(first)) return first;

  // 2. pokušaj — pošalji par primjera u kontekstu da OpenAI jasnije prevede
  const hint =
    target === "ru"
      ? "Translate this short navigation label from Serbian into Russian (use real Russian words, never Latin or Serbian Cyrillic). Examples: O nama → О нас; Usluge → Услуги; Kontakt → Контакты; Blog → Блог."
      : "Translate this short Serbian navigation label into proper English. Examples: O nama → About us; Usluge → Services; Kontakt → Contact; Blog → Blog.";

  const second = await machineTranslateTexts([`${hint} Label: "${meLabel}"`], target).then(
    (r) => r[0] ?? "",
  );

  // OpenAI bi mogao vratiti pun rezultat u navodnicima — izvuci samo dio iz navodnika
  const cleaned = second
    .replace(/^.*?["“„«]([^"”»]+)["”»].*$/s, "$1")
    .trim();

  if (isUsable(cleaned)) return cleaned;
  if (isUsable(second)) return second;

  // Posljednji fallback — vrati ME (nemojmo upisati Latinicu kao RU prevod).
  return meLabel;
}

/** Jedan navigacioni link: ME → EN/RU label, upsert u nav_link_translations. */
export async function translateAndSaveNavLinkByIdAction(
  navLinkId: string,
  options?: TranslateOptions,
): Promise<TranslateSaveNavLinkResult & { skipped?: boolean }> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const [meRow] = await db
    .select({ label: navLinkTranslations.label })
    .from(navLinkTranslations)
    .where(
      and(
        eq(navLinkTranslations.navLinkId, navLinkId),
        eq(navLinkTranslations.locale, defaultLocale),
      ),
    )
    .limit(1);

  const meLabel = (meRow?.label ?? "").trim();
  if (!meLabel) {
    return { ok: false, error: "Nema ME/SR oznake za link." };
  }

  const sourceHash = computeTranslationSourceHash([meLabel]);
  let targetLocales: TargetLocale[] = ["en", "ru"];

  if (options?.onlyMissing) {
    const existingRows = await db
      .select({
        locale: navLinkTranslations.locale,
        label: navLinkTranslations.label,
      })
      .from(navLinkTranslations)
      .where(
        and(
          eq(navLinkTranslations.navLinkId, navLinkId),
          inArray(navLinkTranslations.locale, ["en", "ru"]),
        ),
      );

    const existing: Partial<Record<TargetLocale, { label: string }>> = {};
    for (const row of existingRows) {
      if (row.locale === "en" || row.locale === "ru") {
        existing[row.locale] = { label: strOrEmpty(row.label) };
      }
    }

    targetLocales = localesNeedingNavTranslation(meLabel, existing);
    if (!entityNeedsAnyTranslation(targetLocales)) {
      return { ok: true, navLinkId, skipped: true };
    }
  }

  try {
    const pairs = await Promise.all(
      targetLocales.map(async (loc) => ({
        loc,
        label: (
          await translateNavLabelWithRetry(meLabel, loc)
        )
          .trim()
          .slice(0, 255) || meLabel,
      })),
    );

    for (const { loc, label } of pairs) {
      const [existing] = await db
        .select({ id: navLinkTranslations.id })
        .from(navLinkTranslations)
        .where(
          and(
            eq(navLinkTranslations.navLinkId, navLinkId),
            eq(navLinkTranslations.locale, loc),
          ),
        )
        .limit(1);
      if (existing) {
        await db
          .update(navLinkTranslations)
          .set({ label })
          .where(eq(navLinkTranslations.id, existing.id));
      } else {
        await db.insert(navLinkTranslations).values({
          id: randomUUID(),
          navLinkId,
          locale: loc,
          label,
        });
      }

      await markTranslationSuccess({
        entityType: "nav_link",
        entityId: navLinkId,
        targetLocale: loc,
        sourceHash,
      });
    }

    await db
      .update(navLinks)
      .set({ updatedAt: new Date() })
      .where(eq(navLinks.id, navLinkId));

    revalidatePublicSite();
    revalidatePath("/admin/site");
    revalidatePath("/admin/content/header");
    revalidatePath("/admin/content/header-footer");

    return { ok: true, navLinkId };
  } catch (e) {
    console.error("[translateAndSaveNavLinkByIdAction]", e);
    const msg = e instanceof Error ? e.message : "Prevod nav linka nije uspio.";
    for (const loc of targetLocales) {
      await markTranslationFailed({
        entityType: "nav_link",
        entityId: navLinkId,
        targetLocale: loc,
        sourceHash,
        errorMessage: msg,
      });
    }
    return { ok: false, error: msg };
  }
}

/* ===== SITE STRINGS ===== */

export type TranslateSaveSiteStringsResult =
  | { ok: true; processedKeys: number }
  | { ok: false; error: string };

/** Svi site stringovi (hero, footer, header, sekcije…): ME → EN/RU upis. */
export async function translateAndSaveAllSiteStringsAction(
  options?: TranslateOptions,
): Promise<TranslateSaveSiteStringsResult & { skipped?: boolean }> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const meDefaults = SITE_STRING_DEFAULTS[defaultLocale];
  const meMap: Partial<Record<SiteStringKey, string>> = {};
  for (const key of SITE_STRING_KEYS) {
    const v = meDefaults[key];
    if (v != null && String(v).trim() !== "") {
      meMap[key] = String(v);
    }
  }

  const meRows = await db
    .select({
      fieldKey: siteLocaleStrings.fieldKey,
      value: siteLocaleStrings.value,
    })
    .from(siteLocaleStrings)
    .where(eq(siteLocaleStrings.locale, defaultLocale));

  for (const r of meRows) {
    if (!SITE_STRING_KEYS.includes(r.fieldKey as SiteStringKey)) continue;
    const v = (r.value ?? "").toString();
    if (v.trim() !== "") {
      meMap[r.fieldKey as SiteStringKey] = v;
    }
  }

  let keys = Object.keys(meMap) as SiteStringKey[];
  if (keys.length === 0) {
    return { ok: false, error: "Nema ME/SR vrijednosti za prevod." };
  }

  if (options?.onlyMissing) {
    const localizedRows = await db
      .select({
        fieldKey: siteLocaleStrings.fieldKey,
        locale: siteLocaleStrings.locale,
        value: siteLocaleStrings.value,
      })
      .from(siteLocaleStrings)
      .where(inArray(siteLocaleStrings.locale, ["en", "ru"]));

    const enMap = new Map<string, string>();
    const ruMap = new Map<string, string>();
    for (const row of localizedRows) {
      const v = (row.value ?? "").toString();
      if (row.locale === "en") enMap.set(row.fieldKey, v);
      if (row.locale === "ru") ruMap.set(row.fieldKey, v);
    }

    keys = keys.filter((key) => {
      const meVal = (meMap[key] ?? "").trim();
      if (HREF_LIKE_KEYS.has(key) || isNonTranslatableStringValue(meVal)) {
        return false;
      }
      return (
        needsRuntimeTranslation(enMap.get(key), meVal) ||
        needsRuntimeTranslation(ruMap.get(key), meVal)
      );
    });

    if (keys.length === 0) {
      return { ok: true, processedKeys: 0, skipped: true };
    }
  }

  const meSubset = Object.fromEntries(keys.map((k) => [k, meMap[k]!])) as Partial<
    Record<SiteStringKey, string>
  >;

  try {
    const res = await translateSiteStringsFromMeAction(meSubset);
    if (!res.ok) return res;

    const targets: TargetLocale[] = ["en", "ru"];
    let processed = 0;

    for (const loc of targets) {
      const values = res.translations[loc] ?? {};
      for (const key of keys) {
        const meVal = (meMap[key] ?? "").trim();
        const existingLocalized = await db
          .select({ id: siteLocaleStrings.id, value: siteLocaleStrings.value })
          .from(siteLocaleStrings)
          .where(
            and(
              eq(siteLocaleStrings.fieldKey, key),
              eq(siteLocaleStrings.locale, loc),
            ),
          )
          .limit(1)
          .then((r) => r[0]);

        if (
          options?.onlyMissing &&
          !needsRuntimeTranslation(existingLocalized?.value, meVal)
        ) {
          continue;
        }

        const valueRaw = values[key];
        const value = typeof valueRaw === "string" ? valueRaw : "";
        if (value.trim() === "" && meVal === "") continue;

        const finalValue = value.trim() || meVal || "";
        const now = new Date();
        const sourceHash = computeTranslationSourceHash([meVal]);

        if (existingLocalized) {
          await db
            .update(siteLocaleStrings)
            .set({ value: finalValue, updatedAt: now })
            .where(eq(siteLocaleStrings.id, existingLocalized.id));
        } else {
          await db.insert(siteLocaleStrings).values({
            id: randomUUID(),
            fieldKey: key,
            locale: loc,
            value: finalValue,
            updatedAt: now,
          });
        }

        await markTranslationSuccess({
          entityType: "site_string",
          entityId: key,
          targetLocale: loc,
          sourceHash,
        });
        processed += 1;
      }
    }

    revalidatePublicSite();
    revalidatePath("/admin/content/hero");
    revalidatePath("/admin/content/sections");
    revalidatePath("/admin/content/header-footer");
    revalidatePath("/admin/content/header");

    return { ok: true, processedKeys: processed };
  } catch (e) {
    console.error("[translateAndSaveAllSiteStringsAction]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Prevod site stringova nije uspio.",
    };
  }
}

/* ===== TEAM HIGHLIGHT CARDS (početna — kartice desno) ===== */

export type TranslateSaveTeamHighlightResult =
  | { ok: true; highlightId: string; linkedPageTranslated: boolean }
  | { ok: false; error: string };

function revalidateTeamHighlightAdmin(): void {
  revalidatePublicSite();
  revalidatePath("/admin/content/team");
  revalidatePath("/admin/content/sections");
}

/** Jedna kartica tima: ME naslov + teaser → EN/RU; opciono i povezana CMS stranica. */
export async function translateAndSaveTeamHighlightByIdAction(
  highlightId: string,
  options?: { includeLinkedPage?: boolean },
): Promise<TranslateSaveTeamHighlightResult> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const [row] = await db
    .select({
      title: homeTeamHighlightTranslations.title,
      teaser: homeTeamHighlightTranslations.teaser,
      href: homeTeamHighlights.href,
    })
    .from(homeTeamHighlightTranslations)
    .innerJoin(
      homeTeamHighlights,
      eq(homeTeamHighlightTranslations.highlightId, homeTeamHighlights.id),
    )
    .where(
      and(
        eq(homeTeamHighlightTranslations.highlightId, highlightId),
        eq(homeTeamHighlightTranslations.locale, defaultLocale),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Kartica nije pronađena." };

  const title = (row.title ?? "").trim();
  const teaser = (row.teaser ?? "").trim();
  if (!title && !teaser) {
    return {
      ok: false,
      error: "Unesite naslov ili kratki tekst na ME/SR prije prevoda.",
    };
  }

  try {
    const targets: MachineTranslateTarget[] = ["en", "ru"];
    for (const target of targets) {
      const [titleTr, teaserTr] = await machineTranslateTexts(
        [title, teaser],
        target,
      );
      await upsertHighlightTranslation(
        highlightId,
        target,
        (titleTr ?? title).trim() || title,
        (teaserTr ?? teaser).trim() || null,
      );
    }

    revalidateTeamHighlightAdmin();

    let linkedPageTranslated = false;
    if (options?.includeLinkedPage !== false) {
      const slug = slugFromTeamHighlightHref(row.href);
      if (slug) {
        const page = await getSitePageBySlugForAdmin(slug);
        if (page) {
          const pageRes = await translateAndSaveSitePageByIdAction(page.id);
          linkedPageTranslated = pageRes.ok;
        }
      }
    }

    return { ok: true, highlightId, linkedPageTranslated };
  } catch (e) {
    console.error("[translateAndSaveTeamHighlightByIdAction]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Prevod kartice nije uspio.",
    };
  }
}

export type TranslateSaveAllTeamHighlightsResult = {
  ok: boolean;
  total: number;
  succeeded: number;
  failed: { highlightId: string; label: string; error: string }[];
};

/** Sve kartice desno u bloku tima: ME → EN/RU (+ povezane stranice). */
export async function translateAndSaveAllTeamHighlightsAction(): Promise<TranslateSaveAllTeamHighlightsResult> {
  const gate = await gateContentManage();
  if (!gate.ok) {
    return { ok: false, total: 0, succeeded: 0, failed: [] };
  }

  const rows = await db
    .select({
      id: homeTeamHighlights.id,
      title: homeTeamHighlightTranslations.title,
    })
    .from(homeTeamHighlights)
    .leftJoin(
      homeTeamHighlightTranslations,
      and(
        eq(homeTeamHighlightTranslations.highlightId, homeTeamHighlights.id),
        eq(homeTeamHighlightTranslations.locale, defaultLocale),
      ),
    )
    .orderBy(asc(homeTeamHighlights.sortOrder));

  const failed: TranslateSaveAllTeamHighlightsResult["failed"] = [];
  let succeeded = 0;

  for (const row of rows) {
    const res = await translateAndSaveTeamHighlightByIdAction(row.id);
    if (res.ok) {
      succeeded += 1;
    } else {
      failed.push({
        highlightId: row.id,
        label: row.title?.trim() || "(bez naslova)",
        error: res.error,
      });
    }
  }

  revalidateTeamHighlightAdmin();

  return {
    ok: failed.length === 0,
    total: rows.length,
    succeeded,
    failed,
  };
}

/** Prevodi kratku oznaku (nav link, alt tekst i sl.) ME → EN i RU. */
export async function translateLabelFromMeAction(
  meLabel: string,
): Promise<TranslateLabelsResult> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const text = meLabel.trim();
  if (!text) {
    return {
      ok: false,
      error: "Unesite naziv na ME/SR prije generisanja prevoda.",
    };
  }

  try {
    const [en, ru] = await Promise.all([
      machineTranslateTexts([text], "en").then((r) => r[0] ?? text),
      machineTranslateTexts([text], "ru").then((r) => r[0] ?? text),
    ]);

    return { ok: true, translations: { en, ru } };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generisanje prevoda nije uspjelo.",
    };
  }
}

/* ============================================================
 *  Bulk „Generate missing translations“ (admin pre-generation)
 * ============================================================ */

export type TranslateWorkItem = {
  category: TranslateCategoryKey;
  id: string;
  label: string;
};

function buildMissingWorkQueue(inventory: TranslateInventory): TranslateWorkItem[] {
  const queue: TranslateWorkItem[] = [];

  for (const item of inventory.missing.cmsPages) {
    queue.push({ category: "cmsPages", id: item.id, label: item.label });
  }
  for (const item of inventory.missing.blogPosts) {
    queue.push({ category: "blogPosts", id: item.id, label: item.label });
  }
  for (const item of inventory.missing.teamPosts) {
    queue.push({ category: "teamPosts", id: item.id, label: item.label });
  }
  for (const item of inventory.missing.navLinks) {
    queue.push({ category: "navLinks", id: item.id, label: item.label });
  }
  if (inventory.siteStrings.missingAny) {
    queue.push({
      category: "siteStrings",
      id: "site-strings",
      label: "Tekstovi sajta",
    });
  }

  return queue;
}

export type GenerateMissingBatchResult =
  | {
      ok: true;
      total: number;
      processed: number;
      succeeded: number;
      failed: number;
      skipped: number;
      remaining: number;
      nextOffset: number;
      currentLabel: string | null;
      errors: string[];
    }
  | { ok: false; error: string };

async function runTranslateWorkItem(
  item: TranslateWorkItem,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const opts: TranslateOptions = { onlyMissing: true };

  switch (item.category) {
    case "cmsPages": {
      const res = await translateAndSaveSitePageByIdAction(item.id, opts);
      return res.ok
        ? { ok: true, skipped: res.skipped }
        : { ok: false, error: res.error };
    }
    case "blogPosts":
    case "teamPosts": {
      const res = await translateAndSavePostByIdAction(item.id, opts);
      return res.ok
        ? { ok: true, skipped: res.skipped }
        : { ok: false, error: res.error };
    }
    case "navLinks": {
      const res = await translateAndSaveNavLinkByIdAction(item.id, opts);
      return res.ok
        ? { ok: true, skipped: res.skipped }
        : { ok: false, error: res.error };
    }
    case "siteStrings": {
      const res = await translateAndSaveAllSiteStringsAction(opts);
      return res.ok
        ? { ok: true, skipped: res.skipped }
        : { ok: false, error: res.error };
    }
    default:
      return { ok: false, error: "Nepoznata kategorija." };
  }
}

/** Obradi jedan batch nedostajućih prevoda (10–20 stavki). */
export async function generateMissingTranslationsBatchAction(
  offset: number,
  batchSize: number = TRANSLATION_BATCH_SIZE,
): Promise<GenerateMissingBatchResult> {
  const gate = await gateContentManage();
  if (!gate.ok) return { ok: false, error: gate.error };

  const inventory = await getTranslateInventoryAction();
  const queue = buildMissingWorkQueue(inventory);
  const total = queue.length;
  const slice = queue.slice(offset, offset + batchSize);

  if (slice.length === 0) {
    return {
      ok: true,
      total,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      remaining: 0,
      nextOffset: offset,
      currentLabel: null,
      errors: [],
    };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];
  let currentLabel: string | null = null;

  for (const item of slice) {
    currentLabel = item.label;
    const res = await runTranslateWorkItem(item);
    if (res.ok) {
      if (res.skipped) skipped += 1;
      else succeeded += 1;
    } else {
      failed += 1;
      errors.push(`${item.label}: ${res.error ?? "Nepoznata greška"}`);
    }
  }

  const nextOffset = offset + slice.length;
  const remaining = Math.max(0, total - nextOffset);

  return {
    ok: true,
    total,
    processed: slice.length,
    succeeded,
    failed,
    skipped,
    remaining,
    nextOffset,
    currentLabel,
    errors,
  };
}

export async function logBulkTranslationAuditAction(input: {
  phase: "started" | "completed";
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  const session = await getSession();
  if (!session) return { ok: false, error: "Niste prijavljeni." };

  await writeAuditLog({
    actorUserId: session.userId,
    action:
      input.phase === "started"
        ? "translation.bulk_generate_started"
        : "translation.bulk_generate_completed",
    subjectType: "site_translation",
    subjectId: "bulk-missing",
    metadata: {
      total: input.total,
      succeeded: input.succeeded,
      failed: input.failed,
      skipped: input.skipped,
      provider: getTranslateProvider(),
    },
  });

  return { ok: true };
}
