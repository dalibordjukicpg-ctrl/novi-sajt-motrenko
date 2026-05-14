import {
  boolean,
  datetime,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/** Route / content languages from project rules */
export const localeEnum = mysqlEnum("locale", ["me", "en", "ru", "tr"]);

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const media = mysqlTable("media", {
  id: varchar("id", { length: 36 }).primaryKey(),
  filename: varchar("filename", { length: 512 }).notNull(),
  storageKey: varchar("storage_key", { length: 1024 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  sizeBytes: int("size_bytes").notNull(),
  width: int("width"),
  height: int("height"),
  altText: varchar("alt_text", { length: 512 }),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const posts = mysqlTable("posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  published: boolean("published").notNull().default(false),
  publishedAt: datetime("published_at", { mode: "date", fsp: 3 }),
  /** Naslovna slika za listu / karticu (javni prikaz). */
  coverMediaId: varchar("cover_media_id", { length: 36 }).references(
    () => media.id,
    { onDelete: "set null" },
  ),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const postTranslations = mysqlTable(
  "post_translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    postId: varchar("post_id", { length: 36 })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    locale: localeEnum.notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    excerpt: text("excerpt"),
    body: text("body"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: varchar("meta_description", { length: 512 }),
  },
  (table) => [
    uniqueIndex("post_translations_post_id_locale").on(
      table.postId,
      table.locale,
    ),
    uniqueIndex("post_translations_locale_slug").on(table.locale, table.slug),
  ],
);

export const postsRelations = relations(posts, ({ many }) => ({
  translations: many(postTranslations),
}));

export const postTranslationsRelations = relations(
  postTranslations,
  ({ one }) => ({
    post: one(posts, {
      fields: [postTranslations.postId],
      references: [posts.id],
    }),
  }),
);

/** Lokalizovani ključevi za prezentacioni sajt (hero, kontakt, footer…). */
export const siteLocaleStrings = mysqlTable(
  "site_locale_strings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    fieldKey: varchar("field_key", { length: 120 }).notNull(),
    locale: localeEnum.notNull(),
    value: text("value").notNull(),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("site_locale_strings_key_locale").on(
      table.fieldKey,
      table.locale,
    ),
  ],
);

/** Stavke menija (header); hijerarhija preko parentId. */
export const navLinks = mysqlTable("nav_links", {
  id: varchar("id", { length: 36 }).primaryKey(),
  parentId: varchar("parent_id", { length: 36 }),
  sortOrder: int("sort_order").notNull().default(0),
  href: varchar("href", { length: 512 }).notNull().default("#"),
  visible: boolean("visible").notNull().default(true),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const navLinkTranslations = mysqlTable(
  "nav_link_translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    navLinkId: varchar("nav_link_id", { length: 36 })
      .notNull()
      .references(() => navLinks.id, { onDelete: "cascade" }),
    locale: localeEnum.notNull(),
    label: varchar("label", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("nav_link_translations_link_locale").on(
      table.navLinkId,
      table.locale,
    ),
  ],
);

export const navLinksRelations = relations(navLinks, ({ many, one }) => ({
  translations: many(navLinkTranslations),
  parent: one(navLinks, {
    fields: [navLinks.parentId],
    references: [navLinks.id],
    relationName: "nav_parent",
  }),
  children: many(navLinks, { relationName: "nav_parent" }),
}));

export const navLinkTranslationsRelations = relations(
  navLinkTranslations,
  ({ one }) => ({
    link: one(navLinks, {
      fields: [navLinkTranslations.navLinkId],
      references: [navLinks.id],
    }),
  }),
);

/** Jedan red globalnih podešavanja (logo, favicon, hero pozadina, skripte). */
export const siteGlobals = mysqlTable("site_globals", {
  id: varchar("id", { length: 32 }).primaryKey(),
  logoMediaId: varchar("logo_media_id", { length: 36 }),
  faviconMediaId: varchar("favicon_media_id", { length: 36 }),
  heroBgMediaId: varchar("hero_bg_media_id", { length: 36 }),
  analyticsHeadHtml: text("analytics_head_html"),
  analyticsBodyHtml: text("analytics_body_html"),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

/** SEO: alt tekst slike po jeziku. */
export const mediaAltTranslations = mysqlTable(
  "media_alt_translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    mediaId: varchar("media_id", { length: 36 })
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    locale: localeEnum.notNull(),
    altText: varchar("alt_text", { length: 512 }).notNull().default(""),
  },
  (table) => [
    uniqueIndex("media_alt_trans_media_locale").on(table.mediaId, table.locale),
  ],
);

export const mediaAltTranslationsRelations = relations(
  mediaAltTranslations,
  ({ one }) => ({
    media: one(media, {
      fields: [mediaAltTranslations.mediaId],
      references: [media.id],
    }),
  }),
);

export const mediaRelations = relations(media, ({ many }) => ({
  altTranslations: many(mediaAltTranslations),
}));
