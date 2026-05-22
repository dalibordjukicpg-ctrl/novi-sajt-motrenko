"use server";

import { randomUUID } from "crypto";
import { and, desc, eq, inArray, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertContentMutationAllowed, getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
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
import type { SiteStringKey } from "@/lib/site-fields";
import { SITE_STRING_DEFAULTS, SITE_STRING_KEYS } from "@/lib/site-fields";
import type { ArticleFormValues } from "@/lib/validations/article";

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
        Exclude<Locale, "me">,
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

/** CMS stranica: naslov + HTML tijelo ME → EN i RU. */
export async function translateSitePageFromMeAction(input: {
  title: string;
  body: string;
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

  try {
    const [en, ru] = await Promise.all([
      translateSitePageBlock(input, "en"),
      translateSitePageBlock(input, "ru"),
    ]);

    return {
      ok: true,
      translations: { en, ru },
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
  translations: Record<
    Exclude<Locale, "me">,
    { title: string; body: string }
  >,
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

  const targets: Exclude<Locale, "me">[] = ["en", "ru"];
  for (const loc of targets) {
    const block = translations[loc];
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
): Promise<TranslateSaveSitePageResult> {
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

  const translated = await translateSitePageFromMeAction({ title, body });
  if (!translated.ok) return translated;

  return persistSitePageEnRuTranslations(pageId, page.slug, translated.translations);
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
  siteStrings: { totalWithContent: number; missingRu: boolean };
  /** Podskupovi koji nemaju RU prevod — za "samo nedostajući" mod. */
  missing: {
    cmsPages: TranslateUnit[];
    blogPosts: TranslateUnit[];
    teamPosts: TranslateUnit[];
    navLinks: TranslateUnit[];
  };
};

/** Sve jedinice prevoda po kategorijama (za UI i progres). */
export async function getTranslateInventoryAction(): Promise<TranslateInventory> {
  const gate = await gateContentManage();
  if (!gate.ok) {
    return {
      cmsPages: [],
      blogPosts: [],
      teamPosts: [],
      navLinks: [],
      siteStrings: { totalWithContent: 0, missingRu: false },
      missing: { cmsPages: [], blogPosts: [], teamPosts: [], navLinks: [] },
    };
  }

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

  // ── Dohvati ID-ove koji VEĆ imaju RU prevod ──────────────────────────────
  const ruPageIds = new Set(
    (
      await db
        .select({ pageId: sitePageTranslations.pageId })
        .from(sitePageTranslations)
        .where(eq(sitePageTranslations.locale, "ru"))
    ).map((r) => r.pageId),
  );

  const ruPostIds = new Set(
    (
      await db
        .select({ postId: postTranslations.postId })
        .from(postTranslations)
        .where(eq(postTranslations.locale, "ru"))
    ).map((r) => r.postId),
  );

  const ruNavIds = new Set(
    (
      await db
        .select({ navLinkId: navLinkTranslations.navLinkId })
        .from(navLinkTranslations)
        .where(eq(navLinkTranslations.locale, "ru"))
    ).map((r) => r.navLinkId),
  );

  // ── Site strings count ────────────────────────────────────────────────────
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

  let meStringsCount = 0;
  for (const [key, value] of meStringValues) {
    if (HREF_LIKE_KEYS.has(key)) continue;
    if (isNonTranslatableStringValue(value)) continue;
    meStringsCount += 1;
  }

  // Provjeri da li site strings imaju RU u bazi
  const ruSiteStringsCount = await db
    .select({ id: siteLocaleStrings.id })
    .from(siteLocaleStrings)
    .where(eq(siteLocaleStrings.locale, "ru"))
    .then((r) => r.length);

  // ── Build lists ───────────────────────────────────────────────────────────
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

  return {
    cmsPages: allCmsPages,
    blogPosts: allBlogPosts,
    teamPosts: allTeamPosts,
    navLinks: allNavLinks,
    siteStrings: { totalWithContent: meStringsCount, missingRu: ruSiteStringsCount === 0 },
    missing: {
      cmsPages: allCmsPages.filter((p) => !ruPageIds.has(p.id)),
      blogPosts: allBlogPosts.filter((p) => !ruPostIds.has(p.id)),
      teamPosts: allTeamPosts.filter((p) => !ruPostIds.has(p.id)),
      navLinks: allNavLinks.filter((n) => !ruNavIds.has(n.id)),
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
): Promise<TranslateSavePostResult> {
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

  try {
    const [enBlock, ruBlock] = await Promise.all([
      translateArticleBlock(meBlock, "en"),
      translateArticleBlock(meBlock, "ru"),
    ]);

    const targets: { loc: Exclude<Locale, "me">; block: ArticleLocaleBlock }[] = [
      { loc: "en", block: enBlock },
      { loc: "ru", block: ruBlock },
    ];

    for (const { loc, block } of targets) {
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
    }

    await db
      .update(posts)
      .set({ updatedAt: new Date() })
      .where(eq(posts.id, postId));

    revalidatePublicSite();
    revalidatePath("/admin/posts");
    revalidatePath(`/admin/posts/${postId}/edit`);
    for (const loc of locales) {
      const slugForLoc =
        loc === "me"
          ? meBlock.slug.trim()
          : loc === "en"
            ? enBlock.slug.trim()
            : ruBlock.slug.trim();
      if (slugForLoc) {
        revalidatePath(`/${loc}/posts/${slugForLoc}`);
      }
    }

    return { ok: true, postId };
  } catch (e) {
    console.error("[translateAndSavePostByIdAction]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Prevod članka nije uspio.",
    };
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
): Promise<TranslateSaveNavLinkResult> {
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

  try {
    const [enLabel, ruLabel] = await Promise.all([
      translateNavLabelWithRetry(meLabel, "en"),
      translateNavLabelWithRetry(meLabel, "ru"),
    ]);

    const pairs: { loc: Exclude<Locale, "me">; label: string }[] = [
      { loc: "en", label: enLabel.trim().slice(0, 255) || meLabel },
      { loc: "ru", label: ruLabel.trim().slice(0, 255) || meLabel },
    ];

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
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Prevod nav linka nije uspio.",
    };
  }
}

/* ===== SITE STRINGS ===== */

export type TranslateSaveSiteStringsResult =
  | { ok: true; processedKeys: number }
  | { ok: false; error: string };

/** Svi site stringovi (hero, footer, header, sekcije…): ME → EN/RU upis. */
export async function translateAndSaveAllSiteStringsAction(): Promise<TranslateSaveSiteStringsResult> {
  const gate = await gateContentManage();
  if (!gate.ok) return gate;

  /*
   * ME izvor: prvo defaultne vrijednosti iz koda (SITE_STRING_DEFAULTS.me),
   * pa override iz baze (ako je admin nešto promijenio u UI-u). Bez ovoga,
   * nepromijenjeni ključevi (npr. team.title) ne bi imali ME izvor i ne bi se
   * prevodili.
   */
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

  const keys = Object.keys(meMap) as SiteStringKey[];
  if (keys.length === 0) {
    return { ok: false, error: "Nema ME/SR vrijednosti za prevod." };
  }

  try {
    const res = await translateSiteStringsFromMeAction(meMap);
    if (!res.ok) return res;

    const targets: Exclude<Locale, "me">[] = ["en", "ru"];
    let processed = 0;

    for (const loc of targets) {
      const values = res.translations[loc] ?? {};
      for (const key of keys) {
        const valueRaw = values[key];
        const value = typeof valueRaw === "string" ? valueRaw : "";
        if (value.trim() === "" && (meMap[key] ?? "").trim() === "") continue;

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

        const finalValue = value.trim() || meMap[key] || "";
        const now = new Date();

        if (existing) {
          await db
            .update(siteLocaleStrings)
            .set({ value: finalValue, updatedAt: now })
            .where(eq(siteLocaleStrings.id, existing.id));
        } else {
          await db.insert(siteLocaleStrings).values({
            id: randomUUID(),
            fieldKey: key,
            locale: loc,
            value: finalValue,
            updatedAt: now,
          });
        }
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
