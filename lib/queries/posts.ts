import { and, desc, eq, inArray } from "drizzle-orm";

import type { ArticleFormValues } from "@/lib/validations/article";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, locales } from "@/lib/i18n";
import { db } from "@/lib/db";
import { media, postTranslations, posts } from "@/lib/db/schema";
import { publicUrlFromMediaStorageKey } from "@/lib/media-public";
import { resolvePublishedPostIdForSlug } from "@/lib/post-locale-resolve";
import { preparePublicHtml, stripDuplicateTeamCoverFromBody, extractFirstImageSrcFromHtml } from "@/lib/public-cms-html";
import { sortTeamMembersForDisplay } from "@/lib/team-roster-order";
import {
  isMachineTranslateTarget,
  isRuntimeTranslateEnabled,
  needsRuntimeTranslation,
  translateHtmlForLocale,
  translatePlainForLocale,
  translateTextPairsForLocale,
} from "@/lib/runtime-translate";

export type AdminPostRow = {
  id: string;
  published: boolean;
  contentRole: "blog" | "team";
  updatedAt: Date;
  titleMe: string | null;
  slugMe: string | null;
};

export async function listPostsForAdmin(): Promise<AdminPostRow[]> {
  const rows = await db
    .select({
      id: posts.id,
      published: posts.published,
      contentRole: posts.contentRole,
      updatedAt: posts.updatedAt,
      titleMe: postTranslations.title,
      slugMe: postTranslations.slug,
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

  return rows;
}

function blockFromRow(row: {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}): ArticleFormValues["me"] {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    metaTitle: row.metaTitle ?? "",
    metaDescription: row.metaDescription ?? "",
  };
}

function emptyArticleBlock(): ArticleFormValues["me"] {
  return {
    slug: "",
    title: "",
    excerpt: "",
    body: "",
    metaTitle: "",
    metaDescription: "",
  };
}

export async function getPostForAdminEdit(
  postId: string,
): Promise<ArticleFormValues | null> {
  const [row] = await db
    .select({
      published: posts.published,
      coverMediaId: posts.coverMediaId,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!row) return null;

  const translations = await db
    .select()
    .from(postTranslations)
    .where(eq(postTranslations.postId, postId));

  const byLocale = Object.fromEntries(
    translations.map((t) => [t.locale, t]),
  ) as Record<string, (typeof translations)[0] | undefined>;

  if (!byLocale[defaultLocale]) return null;

  const values: Record<string, unknown> = {
    published: row.published,
    coverMediaId: row.coverMediaId ?? "",
  };
  for (const loc of locales) {
    const r = byLocale[loc];
    values[loc] = r ? blockFromRow(r) : emptyArticleBlock();
  }
  return values as ArticleFormValues;
}

export type PostSummary = {
  postId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

/** Javna lista: objavljeni postovi; naslov/slug za traženi jezik, inače `defaultLocale`. */
export async function listPublishedSummaries(
  locale: Locale,
): Promise<PostSummary[]> {
  const published = await db
    .select({
      id: posts.id,
      coverMediaId: posts.coverMediaId,
    })
    .from(posts)
    .where(
      and(eq(posts.published, true), eq(posts.contentRole, "blog")),
    )
    .orderBy(desc(posts.updatedAt));

  if (published.length === 0) return [];

  const ids = published.map((p) => p.id);
  const mediaIds = [
    ...new Set(
      published
        .map((p) => p.coverMediaId)
        .filter((x): x is string => x != null && x.length > 0),
    ),
  ];

  const coverUrlByMediaId = new Map<string, string>();
  if (mediaIds.length > 0) {
    const mrows = await db
      .select({ id: media.id, storageKey: media.storageKey })
      .from(media)
      .where(inArray(media.id, mediaIds));
    for (const m of mrows) {
      coverUrlByMediaId.set(
        m.id,
        publicUrlFromMediaStorageKey(m.storageKey),
      );
    }
  }

  const trans = await db
    .select()
    .from(postTranslations)
    .where(inArray(postTranslations.postId, ids));

  const byPost = new Map<string, Map<string, (typeof trans)[0]>>();
  for (const t of trans) {
    let m = byPost.get(t.postId);
    if (!m) {
      m = new Map();
      byPost.set(t.postId, m);
    }
    m.set(t.locale, t);
  }

  const coverByPostId = new Map(
    published.map((p) => [
      p.id,
      p.coverMediaId
        ? (coverUrlByMediaId.get(p.coverMediaId) ?? null)
        : null,
    ]),
  );

  const draft: PostSummary[] = [];
  const titlePairs: { localized: string; me: string }[] = [];

  for (const id of ids) {
    const m = byPost.get(id);
    if (!m) continue;
    const primary = m.get(locale);
    const fallback = m.get(defaultLocale);
    const t = primary ?? fallback;
    if (!t) continue;
    const meTitle = (fallback?.title ?? t.title).trim();
    const locTitle = (t.title ?? "").trim();
    titlePairs.push({ localized: locTitle, me: meTitle });
    draft.push({
      postId: id,
      slug: t.slug,
      title: locTitle,
      coverUrl: coverByPostId.get(id) ?? null,
    });
  }

  if (
    isMachineTranslateTarget(locale) &&
    isRuntimeTranslateEnabled() &&
    titlePairs.length > 0
  ) {
    const titles = await translateTextPairsForLocale(titlePairs, locale);
    for (let i = 0; i < draft.length; i++) {
      draft[i]!.title = titles[i] ?? draft[i]!.title;
    }
  }

  return draft;
}

export type TeamMemberSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
};

/** Objavljeni profili tima (content_role = team), za stranicu /s/tim. */
export async function listPublishedTeamSummaries(
  locale: Locale,
): Promise<TeamMemberSummary[]> {
  const published = await db
    .select({
      id: posts.id,
      coverMediaId: posts.coverMediaId,
    })
    .from(posts)
    .where(
      and(eq(posts.published, true), eq(posts.contentRole, "team")),
    )
    .orderBy(desc(posts.updatedAt));

  if (published.length === 0) return [];

  const ids = published.map((p) => p.id);
  const mediaIds = [
    ...new Set(
      published
        .map((p) => p.coverMediaId)
        .filter((x): x is string => x != null && x.length > 0),
    ),
  ];

  const coverUrlByMediaId = new Map<string, string>();
  if (mediaIds.length > 0) {
    const mrows = await db
      .select({ id: media.id, storageKey: media.storageKey })
      .from(media)
      .where(inArray(media.id, mediaIds));
    for (const m of mrows) {
      coverUrlByMediaId.set(
        m.id,
        publicUrlFromMediaStorageKey(m.storageKey),
      );
    }
  }

  const trans = await db
    .select()
    .from(postTranslations)
    .where(inArray(postTranslations.postId, ids));

  const byPost = new Map<string, Map<string, (typeof trans)[0]>>();
  for (const t of trans) {
    let m = byPost.get(t.postId);
    if (!m) {
      m = new Map();
      byPost.set(t.postId, m);
    }
    m.set(t.locale, t);
  }

  const coverByPostId = new Map(
    published.map((p) => [
      p.id,
      p.coverMediaId
        ? (coverUrlByMediaId.get(p.coverMediaId) ?? null)
        : null,
    ]),
  );

  const draft: TeamMemberSummary[] = [];
  const titlePairs: { localized: string; me: string }[] = [];
  const excerptPairs: { localized: string; me: string }[] = [];

  for (const id of ids) {
    const m = byPost.get(id);
    if (!m) continue;
    const primary = m.get(locale);
    const fallback = m.get(defaultLocale);
    const t = primary ?? fallback;
    if (!t) continue;
    const meTitle = (fallback?.title ?? t.title).trim();
    const meExcerpt = (fallback?.excerpt ?? t.excerpt ?? "").trim();
    const locTitle = (t.title ?? "").trim();
    const locExcerpt = (t.excerpt ?? "").trim();
    titlePairs.push({ localized: locTitle, me: meTitle });
    excerptPairs.push({ localized: locExcerpt, me: meExcerpt });
    draft.push({
      slug: t.slug,
      title: locTitle,
      excerpt: t.excerpt,
      coverUrl: coverByPostId.get(id) ?? null,
    });
  }

  if (isMachineTranslateTarget(locale) && isRuntimeTranslateEnabled()) {
    if (titlePairs.length > 0) {
      const titles = await translateTextPairsForLocale(titlePairs, locale);
      for (let i = 0; i < draft.length; i++) {
        draft[i]!.title = titles[i] ?? draft[i]!.title;
      }
    }
    if (excerptPairs.some((p) => needsRuntimeTranslation(p.localized, p.me))) {
      const excerpts = await translateTextPairsForLocale(excerptPairs, locale);
      for (let i = 0; i < draft.length; i++) {
        const ex = excerpts[i]?.trim();
        if (ex) draft[i]!.excerpt = ex;
      }
    }
  }

  return sortTeamMembersForDisplay(draft);
}

export type PublicPost = {
  postId: string;
  contentRole: "blog" | "team";
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  coverUrl: string | null;
};

type TransRow = {
  postId: string;
  contentRole: "blog" | "team";
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  coverKey: string | null;
  locale: string;
};

/** Javni članak: prvo `locale`, inače `defaultLocale` za isti post (slug može biti iz bilo kojeg jezika u URL-u). */
export async function getPublishedPostBySlug(
  locale: Locale,
  slug: string,
): Promise<PublicPost | null> {
  const postId = await resolvePublishedPostIdForSlug(slug, locale);
  if (!postId) return null;

  const rows: TransRow[] = await db
    .select({
      postId: posts.id,
      contentRole: posts.contentRole,
      slug: postTranslations.slug,
      title: postTranslations.title,
      excerpt: postTranslations.excerpt,
      body: postTranslations.body,
      metaTitle: postTranslations.metaTitle,
      metaDescription: postTranslations.metaDescription,
      coverKey: media.storageKey,
      locale: postTranslations.locale,
    })
    .from(postTranslations)
    .innerJoin(posts, eq(postTranslations.postId, posts.id))
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.published, true),
        inArray(postTranslations.locale, [locale, defaultLocale]),
      ),
    );

  if (rows.length === 0) return null;

  const meRow = rows.find((r) => r.locale === defaultLocale);
  const locRow = rows.find((r) => r.locale === locale);
  const row = locRow ?? meRow;
  if (!row) return null;

  let title = row.title;
  let excerpt = row.excerpt;
  let bodySource = row.body;
  let metaTitle = row.metaTitle;
  let metaDescription = row.metaDescription;

  if (isRuntimeTranslateEnabled() && isMachineTranslateTarget(locale) && meRow) {
    if (needsRuntimeTranslation(title, meRow.title)) {
      title = await translatePlainForLocale(meRow.title, locale);
    }
    if (excerpt?.trim() && needsRuntimeTranslation(excerpt, meRow.excerpt)) {
      excerpt = await translatePlainForLocale(meRow.excerpt ?? "", locale);
    }
    const meBody = meRow.body ?? "";
    if (
      bodySource?.trim() &&
      needsRuntimeTranslation(bodySource, meBody)
    ) {
      bodySource = meBody.includes("<")
        ? await translateHtmlForLocale(meBody, locale)
        : await translatePlainForLocale(meBody, locale);
    }
    if (metaTitle?.trim() && needsRuntimeTranslation(metaTitle, meRow.metaTitle)) {
      metaTitle = await translatePlainForLocale(meRow.metaTitle ?? "", locale);
    }
    if (
      metaDescription?.trim() &&
      needsRuntimeTranslation(metaDescription, meRow.metaDescription)
    ) {
      metaDescription = await translatePlainForLocale(
        meRow.metaDescription ?? "",
        locale,
      );
    }
  }

  const coverFromMedia = row.coverKey
    ? publicUrlFromMediaStorageKey(row.coverKey)
    : null;
  const bodyHtml = bodySource ? preparePublicHtml(bodySource, locale) : null;
  const coverUrl =
    coverFromMedia ?? extractFirstImageSrcFromHtml(bodyHtml) ?? null;
  const bodyProcessed =
    row.contentRole === "team" && bodyHtml
      ? stripDuplicateTeamCoverFromBody(bodyHtml, coverUrl ?? undefined)
      : bodyHtml;

  return {
    postId: row.postId,
    contentRole: row.contentRole,
    slug: row.slug,
    title,
    excerpt,
    body: bodyProcessed,
    metaTitle,
    metaDescription,
    coverUrl,
  };
}
