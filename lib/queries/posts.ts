import { and, desc, eq, inArray } from "drizzle-orm";

import type { ArticleFormValues } from "@/lib/validations/article";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, locales } from "@/lib/i18n";
import { db } from "@/lib/db";
import { media, postTranslations, posts } from "@/lib/db/schema";
import { publicUrlFromMediaStorageKey } from "@/lib/media-public";
import { preparePublicHtml, stripDuplicateTeamCoverFromBody } from "@/lib/public-cms-html";

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

  for (const loc of locales) {
    if (!byLocale[loc]) return null;
  }

  const values: Record<string, unknown> = {
    published: row.published,
    coverMediaId: row.coverMediaId ?? "",
  };
  for (const loc of locales) {
    values[loc] = blockFromRow(byLocale[loc]!);
  }
  return values as ArticleFormValues;
}

export type PostSummary = {
  postId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

/** Javna lista: objavljeni postovi; redosled po datumu izmjene; naslov/slug za traženi jezik, inače me. */
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

  const out: PostSummary[] = [];
  for (const id of ids) {
    const m = byPost.get(id);
    if (!m) continue;
    const primary = m.get(locale);
    const fallback = m.get(defaultLocale);
    const t = primary ?? fallback;
    if (!t) continue;
    out.push({
      postId: id,
      slug: t.slug,
      title: t.title,
      coverUrl: coverByPostId.get(id) ?? null,
    });
  }

  return out;
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

  const out: TeamMemberSummary[] = [];
  for (const id of ids) {
    const m = byPost.get(id);
    if (!m) continue;
    const primary = m.get(locale);
    const fallback = m.get(defaultLocale);
    const t = primary ?? fallback;
    if (!t) continue;
    out.push({
      slug: t.slug,
      title: t.title,
      excerpt: t.excerpt,
      coverUrl: coverByPostId.get(id) ?? null,
    });
  }

  return out;
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

/** Jedan objavljen članak: tačno (locale + slug), inače 404. */
export async function getPublishedPostBySlug(
  locale: Locale,
  slug: string,
): Promise<PublicPost | null> {
  const rows = await db
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
    })
    .from(postTranslations)
    .innerJoin(posts, eq(postTranslations.postId, posts.id))
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .where(
      and(
        eq(postTranslations.locale, locale),
        eq(postTranslations.slug, slug),
        eq(posts.published, true),
      ),
    )
    .limit(1);

  const [row] = rows;
  if (!row) return null;

  const coverUrl = row.coverKey
    ? publicUrlFromMediaStorageKey(row.coverKey)
    : null;
  const bodyHtml = row.body ? preparePublicHtml(row.body, locale) : null;
  const bodyProcessed =
    row.contentRole === "team" && bodyHtml
      ? stripDuplicateTeamCoverFromBody(
          bodyHtml,
          coverUrl ?? undefined,
        )
      : bodyHtml;

  return {
    postId: row.postId,
    contentRole: row.contentRole,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: bodyProcessed,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    coverUrl,
  };
}
