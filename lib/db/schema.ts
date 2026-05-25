import {
  boolean,
  datetime,
  int,
  index,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/** Route / content languages from project rules */
export const localeEnum = mysqlEnum("locale", ["me", "en", "ru"]);

/** RBAC roles (MySQL column `role`). */
export const userRoleEnum = mysqlEnum("role", [
  "SUPER_ADMIN",
  "ADMIN",
  "STAFF",
  "USER",
]);

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "USER";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum.notNull().default("USER"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerifiedAt: datetime("email_verified_at", { mode: "date", fsp: 3 }),
  lastLoginAt: datetime("last_login_at", { mode: "date", fsp: 3 }),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

/** Server-side sessions (opaque token, hash-only storage). */
export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    revokedAt: datetime("revoked_at", { mode: "date", fsp: 3 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(authSessions),
}));

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    usedAt: datetime("used_at", { mode: "date", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("password_reset_tokens_user_id_idx").on(table.userId)],
);

export const emailVerificationTokens = mysqlTable(
  "email_verification_tokens",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    usedAt: datetime("used_at", { mode: "date", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("email_verification_tokens_user_id_idx").on(table.userId),
  ],
);

export const contentResourceTypeEnum = mysqlEnum("content_resource_type", [
  "post",
  "site_page",
]);

/** STAFF: explicit assignment to posts/pages. */
export const contentAssignments = mysqlTable(
  "content_assignments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceType: contentResourceTypeEnum.notNull(),
    resourceId: varchar("resource_id", { length: 36 }).notNull(),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("content_assign_user_resource").on(
      table.userId,
      table.resourceType,
      table.resourceId,
    ),
    index("content_assignments_user_id_idx").on(table.userId),
  ],
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorUserId: varchar("actor_user_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    action: varchar("action", { length: 120 }).notNull(),
    subjectType: varchar("subject_type", { length: 64 }),
    subjectId: varchar("subject_id", { length: 64 }),
    metadata: text("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

/** Javni upit za zakazivanje / konsultaciju (sadržaj može uključivati zdravstvene podatke). */
export type AppointmentVisitReason =
  | "consultation"
  | "first_visit"
  | "follow_up"
  | "infertility"
  | "pregnancy"
  | "ultrasound"
  | "gynecology"
  | "other";

export type AppointmentPartner = "yes" | "no" | "na";

/** Ko dolazi na pregled (javna prijavnica). */
export type AppointmentWhoAttends = "patient_only" | "couple_both" | "with_partner";

export type AppointmentContactPref = "phone" | "email" | "whatsapp";

export type AppointmentTimeWindow =
  | "morning"
  | "midday"
  | "afternoon"
  | "flexible";

export const appointmentRequests = mysqlTable(
  "appointment_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    locale: localeEnum.notNull(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 64 }).notNull(),
    dateOfBirth: varchar("date_of_birth", { length: 32 }),
    whoAttends: mysqlEnum("who_attends", [
      "patient_only",
      "couple_both",
      "with_partner",
    ])
      .$type<AppointmentWhoAttends>()
      .notNull()
      .default("patient_only"),
    partnerFullName: varchar("partner_full_name", { length: 200 }),
    partnerPhone: varchar("partner_phone", { length: 64 }),
    visitReason: mysqlEnum("visit_reason", [
      "consultation",
      "first_visit",
      "follow_up",
      "infertility",
      "pregnancy",
      "ultrasound",
      "gynecology",
      "other",
    ])
      .$type<AppointmentVisitReason>()
      .notNull(),
    visitReasonOther: varchar("visit_reason_other", { length: 500 }),
    whatBroughtYou: text("what_brought_you"),
    tryingConceiveDuration: varchar("trying_conceive_duration", {
      length: 24,
    }),
    treatmentElsewhere: boolean("treatment_elsewhere"),
    treatmentElsewhereNote: text("treatment_elsewhere_note"),
    diagnosesNotes: text("diagnoses_notes"),
    medications: text("medications"),
    allergies: text("allergies"),
    lastMenstruationOrNote: varchar("last_menstruation_or_note", {
      length: 255,
    }),
    partnerAttending: mysqlEnum("partner_attending", ["yes", "no", "na"])
      .$type<AppointmentPartner>()
      .notNull()
      .default("na"),
    preferredDate: varchar("preferred_date", { length: 64 }),
    preferredTimeWindow: mysqlEnum("preferred_time_window", [
      "morning",
      "midday",
      "afternoon",
      "flexible",
    ]).$type<AppointmentTimeWindow>(),
    contactPreference: mysqlEnum("contact_preference", [
      "phone",
      "email",
      "whatsapp",
    ])
      .$type<AppointmentContactPref>()
      .notNull(),
    consentAccepted: boolean("consent_accepted").notNull(),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
  },
  (table) => [
    index("appointment_requests_created_at_idx").on(table.createdAt),
    index("appointment_requests_locale_idx").on(table.locale),
  ],
);

/** Javna kontakt forma (sajt → email + PDF arhiva u bazi). */
export const contactSubmissions = mysqlTable(
  "contact_submissions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    locale: localeEnum.notNull(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 64 }).notNull(),
    inquiryType: varchar("inquiry_type", { length: 500 }),
    message: text("message").notNull(),
    consentAccepted: boolean("consent_accepted").notNull(),
    emailSent: boolean("email_sent").notNull().default(false),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
  },
  (table) => [
    index("contact_submissions_created_at_idx").on(table.createdAt),
    index("contact_submissions_email_idx").on(table.email),
  ],
);

/** Javne posjete (prati se klijentski beacon + server zapis u Node rutama). */
export const analyticsVisits = mysqlTable(
  "analytics_visits",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    occurredAt: datetime("occurred_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
    path: varchar("path", { length: 2048 }).notNull(),
    locale: varchar("locale", { length: 8 }),
    referrer: varchar("referrer", { length: 2048 }),
    referrerHost: varchar("referrer_host", { length: 255 }),
    countryCode: varchar("country_code", { length: 2 }),
    region: varchar("region", { length: 128 }),
    city: varchar("city", { length: 128 }),
    deviceType: varchar("device_type", { length: 16 }).notNull().default("unknown"),
    browser: varchar("browser", { length: 80 }),
    osName: varchar("os_name", { length: 80 }),
    isBot: boolean("is_bot").notNull().default(false),
    visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
  },
  (table) => [
    index("analytics_visits_occurred_at_idx").on(table.occurredAt),
    index("analytics_visits_country_idx").on(table.countryCode),
    index("analytics_visits_bot_idx").on(table.isBot),
  ],
);

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

export const postContentRoleEnum = mysqlEnum("content_role", ["blog", "team"]);

export const posts = mysqlTable("posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  published: boolean("published").notNull().default(false),
  publishedAt: datetime("published_at", { mode: "date", fsp: 3 }),
  /** Novosti vs. profili osoblja (WP kategorije). */
  contentRole: postContentRoleEnum.notNull().default("blog"),
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
    /** `longtext` — WP `post_content` može prijeći 64 KB (MySQL TEXT limit). */
    body: longtext("body"),
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
/** Gdje se stavka prikazuje; footer koristi footerColumn za grupe linkova. */
export const navLinks = mysqlTable("nav_links", {
  id: varchar("id", { length: 36 }).primaryKey(),
  parentId: varchar("parent_id", { length: 36 }),
  sortOrder: int("sort_order").notNull().default(0),
  href: varchar("href", { length: 512 }).notNull().default("#"),
  visible: boolean("visible").notNull().default(true),
  placement: mysqlEnum("placement", ["header", "footer"])
    .notNull()
    .default("header"),
  /** 0 = header / nije u koloni; 1–4 = kolona u footeru */
  footerColumn: int("footer_column").notNull().default(0),
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

/** Statičke stranice (uvoz WP „page“, ili ručno u budućnosti). */
export const sitePages = mysqlTable(
  "site_pages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull(),
    /**
     * Grupa u headeru pod „Uslugama“ (npr. infertilitet → stavka „Infertilitet i sterilitet”).
     * Prazno: stranica ide u glavni red ili pod Uslugama bez podgrupe, ako nema stabla.
     */
    headerNavGroup: varchar("header_nav_group", { length: 64 }),
    published: boolean("published").notNull().default(true),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("site_pages_slug_unique").on(table.slug)],
);

export const sitePageTranslations = mysqlTable(
  "site_page_translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    pageId: varchar("page_id", { length: 36 })
      .notNull()
      .references(() => sitePages.id, { onDelete: "cascade" }),
    locale: localeEnum.notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: longtext("body"),
  },
  (table) => [
    uniqueIndex("site_page_trans_page_locale").on(table.pageId, table.locale),
  ],
);

export const sitePagesRelations = relations(sitePages, ({ many }) => ({
  translations: many(sitePageTranslations),
}));

export const sitePageTranslationsRelations = relations(
  sitePageTranslations,
  ({ one }) => ({
    page: one(sitePages, {
      fields: [sitePageTranslations.pageId],
      references: [sitePages.id],
    }),
  }),
);

/** Jedan red globalnih podešavanja (logo, favicon, hero pozadina, skripte). */
export const siteGlobals = mysqlTable("site_globals", {
  id: varchar("id", { length: 32 }).primaryKey(),
  logoMediaId: varchar("logo_media_id", { length: 36 }),
  faviconMediaId: varchar("favicon_media_id", { length: 36 }),
  heroBgMediaId: varchar("hero_bg_media_id", { length: 36 }),
  /** YouTube ili direktan URL videa/slike (ako je postavljen, ima prednost nad heroBgMediaId). */
  heroBgExternalUrl: varchar("hero_bg_external_url", { length: 512 }),
  /** Početna — blok „Upoznajte tim“: portreti (4). */
  teamM1MediaId: varchar("team_m1_media_id", { length: 36 }),
  teamM2MediaId: varchar("team_m2_media_id", { length: 36 }),
  teamM3MediaId: varchar("team_m3_media_id", { length: 36 }),
  teamM4MediaId: varchar("team_m4_media_id", { length: 36 }),
  analyticsHeadHtml: text("analytics_head_html"),
  analyticsBodyHtml: text("analytics_body_html"),
  /** Javni sajt: cijela prezentacija zamijenjena ekranom održavanja (admin ostaje dostupan). */
  maintenanceEnabled: boolean("maintenance_enabled").notNull().default(false),
  maintenanceTitle: varchar("maintenance_title", { length: 255 }),
  maintenanceMessage: text("maintenance_message"),
  /** Ako je null, koristi se glavni logo (`logoMediaId`). */
  maintenanceLogoMediaId: varchar("maintenance_logo_media_id", { length: 36 }),
  /** Javne IP adrese koje i dalje vide sajt tokom održavanja (zarez / novi red). */
  maintenanceBypassIps: text("maintenance_bypass_ips"),
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

/** Kartice usluga na početnoj stranici (zamjenjuju nav-derived prikaz). */
export const homeServiceCards = mysqlTable("home_service_cards", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sortOrder: int("sort_order").notNull().default(0),
  iconName: varchar("icon_name", { length: 64 }).notNull().default("heart"),
  href: varchar("href", { length: 512 }).notNull().default("#"),
  visible: boolean("visible").notNull().default(true),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const homeServiceCardTranslations = mysqlTable(
  "home_service_card_translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    cardId: varchar("card_id", { length: 36 })
      .notNull()
      .references(() => homeServiceCards.id, { onDelete: "cascade" }),
    locale: localeEnum.notNull(),
    title: varchar("title", { length: 500 }).notNull().default(""),
    description: text("description"),
  },
  (table) => [
    uniqueIndex("home_card_trans_card_locale").on(table.cardId, table.locale),
  ],
);

export const homeServiceCardsRelations = relations(homeServiceCards, ({ many }) => ({
  translations: many(homeServiceCardTranslations),
}));

export const homeServiceCardTranslationsRelations = relations(
  homeServiceCardTranslations,
  ({ one }) => ({
    card: one(homeServiceCards, {
      fields: [homeServiceCardTranslations.cardId],
      references: [homeServiceCards.id],
    }),
  }),
);

/** Kartice desno u bloku „Upoznajte tim“ na početnoj (link na CMS stranice). */
export const homeTeamHighlights = mysqlTable("home_team_highlights", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sortOrder: int("sort_order").notNull().default(0),
  href: varchar("href", { length: 512 }).notNull().default("#"),
  visible: boolean("visible").notNull().default(true),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const homeTeamHighlightTranslations = mysqlTable(
  "home_team_highlight_translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    highlightId: varchar("highlight_id", { length: 36 })
      .notNull()
      .references(() => homeTeamHighlights.id, { onDelete: "cascade" }),
    locale: localeEnum.notNull(),
    title: varchar("title", { length: 500 }).notNull().default(""),
    teaser: text("teaser"),
  },
  (table) => [
    uniqueIndex("home_team_hl_trans_hl_locale").on(table.highlightId, table.locale),
  ],
);

export const homeTeamHighlightsRelations = relations(homeTeamHighlights, ({ many }) => ({
  translations: many(homeTeamHighlightTranslations),
}));

export const homeTeamHighlightTranslationsRelations = relations(
  homeTeamHighlightTranslations,
  ({ one }) => ({
    highlight: one(homeTeamHighlights, {
      fields: [homeTeamHighlightTranslations.highlightId],
      references: [homeTeamHighlights.id],
    }),
  }),
);

export const translationEntityTypeEnum = mysqlEnum("translation_entity_type", [
  "site_page",
  "post",
  "nav_link",
  "site_string",
  "team_highlight",
]);

export const translationStatusEnum = mysqlEnum("translation_status", [
  "missing",
  "pending",
  "machine",
  "human",
  "stale",
  "failed",
]);

/** Metadata o mašinskom/ljudskom prevodu po entitetu i ciljnom jeziku. */
export const translationRecords = mysqlTable(
  "translation_records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    entityType: translationEntityTypeEnum.notNull(),
    entityId: varchar("entity_id", { length: 120 }).notNull(),
    sourceLocale: localeEnum.notNull().default("me"),
    targetLocale: localeEnum.notNull(),
    translationStatus: translationStatusEnum.notNull().default("missing"),
    translatedAt: datetime("translated_at", { fsp: 3 }),
    translationProvider: varchar("translation_provider", { length: 32 }),
    sourceHash: varchar("source_hash", { length: 64 }),
    errorMessage: text("error_message"),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("tr_entity_target_locale").on(
      table.entityType,
      table.entityId,
      table.targetLocale,
    ),
    index("tr_status").on(table.translationStatus),
  ],
);
