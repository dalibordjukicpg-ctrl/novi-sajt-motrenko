import { and, asc, eq } from "drizzle-orm";

import { CHATBOT_COPY, BUILTIN_KEYWORDS } from "@/lib/chatbot/copy";
import { buildField, htmlToText, type TokenField } from "@/lib/chatbot/text";
import { db } from "@/lib/db";
import {
  chatbotKnowledge,
  chatbotKnowledgeTranslations,
  postTranslations,
  posts,
  sitePageTranslations,
  sitePages,
} from "@/lib/db/schema";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { listPublishedTeamSummaries } from "@/lib/queries/posts";
import { getSiteStringsMapWithFallback, mergeSiteStrings } from "@/lib/queries/site";
import { resolvePublicHref } from "@/lib/resolve-public-href";

export type BotLink = { label: string; href: string };

export type BotDoc = {
  /** Ključ za statistiku: entry:<id>, builtin:<ime>, page:<slug>, post:<slug>. */
  key: string;
  kind: "entry" | "builtin" | "page" | "post";
  title: string;
  /** Tekst koji bot prikazuje (za stranice — cijeli odjeljak, iz kojeg se bira izvod). */
  text: string;
  links: BotLink[];
  /** Pitanje koje se nudi kao „Možda vas zanima” (samo unosi i ugrađeni odgovori). */
  suggestion: string | null;
  weight: number;
  keywords: TokenField;
  titleField: TokenField;
  body: TokenField;
};

/** Stranice koje nisu za pacijente. */
const SKIP_PAGE_SLUGS = new Set(["maintenance-page"]);

const TTL_MS = 60_000;

const globalCache = globalThis as typeof globalThis & {
  __chatbotIndex?: Map<Locale, { at: number; docs: BotDoc[] }>;
};

/** Poziva admin poslije izmjene znanja, da bot odmah vidi novo. */
export function clearChatbotIndexCache(): void {
  globalCache.__chatbotIndex?.clear();
}

export async function getChatbotDocs(locale: Locale): Promise<BotDoc[]> {
  const cache = (globalCache.__chatbotIndex ??= new Map());
  const hit = cache.get(locale);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.docs;
  const docs = await buildDocs(locale);
  cache.set(locale, { at: Date.now(), docs });
  return docs;
}

function makeDoc(
  d: Omit<BotDoc, "keywords" | "titleField" | "body">,
  keywords: string,
  bodyText: string = d.text,
): BotDoc {
  return {
    ...d,
    keywords: buildField(keywords),
    titleField: buildField(d.title),
    body: buildField(bodyText),
  };
}

async function buildDocs(locale: Locale): Promise<BotDoc[]> {
  const [entries, builtins, pages, articles] = await Promise.all([
    loadKnowledgeEntries(locale),
    loadBuiltins(locale),
    loadSitePages(locale),
    loadPosts(locale),
  ]);
  return [...entries, ...builtins, ...pages, ...articles];
}

/** Unosi iz admina (Bot → Baza znanja). Jezik pacijenta, pa ME kao rezerva. */
async function loadKnowledgeEntries(locale: Locale): Promise<BotDoc[]> {
  const rows = await db
    .select({
      id: chatbotKnowledge.id,
      linkHref: chatbotKnowledge.linkHref,
      locale: chatbotKnowledgeTranslations.locale,
      question: chatbotKnowledgeTranslations.question,
      keywords: chatbotKnowledgeTranslations.keywords,
      answer: chatbotKnowledgeTranslations.answer,
    })
    .from(chatbotKnowledge)
    .innerJoin(
      chatbotKnowledgeTranslations,
      eq(chatbotKnowledgeTranslations.entryId, chatbotKnowledge.id),
    )
    .where(eq(chatbotKnowledge.published, true))
    .orderBy(asc(chatbotKnowledge.sortOrder));

  const byId = new Map<string, Map<string, (typeof rows)[number]>>();
  for (const r of rows) {
    const m = byId.get(r.id) ?? new Map();
    m.set(r.locale, r);
    byId.set(r.id, m);
  }

  const copy = CHATBOT_COPY[locale];
  const out: BotDoc[] = [];
  for (const [id, m] of byId) {
    const t = pickFilled(m.get(locale)) ?? pickFilled(m.get(defaultLocale));
    if (!t) continue;
    const me = m.get(defaultLocale);
    const href = t.linkHref?.trim();
    out.push(
      makeDoc(
        {
          key: `entry:${id}`,
          kind: "entry",
          title: t.question.trim(),
          text: t.answer.trim(),
          links: href ? [{ label: copy.readMore, href: resolvePublicHref(locale, href) }] : [],
          suggestion: t.question.trim(),
          weight: 1.15,
        },
        // ME ključne riječi uvijek važe — pacijent na /en često piše na našem jeziku.
        [t.keywords ?? "", me && me !== t ? `${me.question} ${me.keywords ?? ""}` : ""].join(" "),
      ),
    );
  }
  return out;
}

function pickFilled<T extends { question: string; answer: string }>(row: T | undefined): T | null {
  if (!row) return null;
  return row.question.trim() && row.answer.trim() ? row : null;
}

/** Radno vrijeme, lokacija, kontakt, tim i zakazivanje — iz podešavanja sajta, uvijek ažurno. */
async function loadBuiltins(locale: Locale): Promise<BotDoc[]> {
  const copy = CHATBOT_COPY[locale];
  const s = mergeSiteStrings(locale, await getSiteStringsMapWithFallback(locale));
  const phone1 = s["contact.phone1"]?.trim() ?? "";
  const phone2 = s["contact.phone2"]?.trim() ?? "";
  const email = s["contact.email"]?.trim() ?? "";
  const address = s["contact.address"]?.trim() ?? "";
  const mapsHref = s["contact.maps_href"]?.trim() ?? "";
  const bookHref = resolvePublicHref(locale, s["header.cta_book_href"] || "#kontakt");
  const phones = [phone1, phone2].filter(Boolean);
  const telLink = phone1 ? [{ label: `${copy.callUs}: ${phone1}`, href: `tel:${phone1.replace(/[^\d+]/g, "")}` }] : [];

  const hoursLines = [
    `${copy.hoursMonFri}: ${s["hours.mon_fri"] ?? ""}`,
    s["hours.tuesday"] && s["hours.tuesday"] !== s["hours.mon_fri"]
      ? `${copy.hoursTuesday}: ${s["hours.tuesday"]}`
      : "",
    `${copy.hoursSat}: ${s["hours.sat"] ?? ""}`,
    `${copy.hoursSun}: ${s["hours.sun"] ?? ""}`,
  ].filter(Boolean);

  const out: BotDoc[] = [
    makeDoc(
      {
        key: "builtin:hours",
        kind: "builtin",
        title: copy.hoursTitle,
        text: hoursLines.join("\n"),
        links: [],
        suggestion: copy.hoursTitle,
        weight: 1,
      },
      BUILTIN_KEYWORDS.hours,
      "",
    ),
    makeDoc(
      {
        key: "builtin:location",
        kind: "builtin",
        title: copy.locationTitle,
        text: address,
        links: mapsHref ? [{ label: copy.showMap, href: mapsHref }] : [],
        suggestion: copy.locationTitle,
        weight: 1,
      },
      BUILTIN_KEYWORDS.location,
      "",
    ),
    makeDoc(
      {
        key: "builtin:contact",
        kind: "builtin",
        title: copy.contactTitle,
        text: [
          phones.length ? `${copy.contactPhone}: ${phones.join(", ")}` : "",
          email ? `${copy.contactEmail}: ${email}` : "",
          address,
        ]
          .filter(Boolean)
          .join("\n"),
        links: telLink,
        suggestion: copy.contactTitle,
        weight: 1,
      },
      BUILTIN_KEYWORDS.contact,
      "",
    ),
    makeDoc(
      {
        key: "builtin:booking",
        kind: "builtin",
        title: copy.bookingTitle,
        text: copy.bookingText(phone1),
        links: [{ label: copy.bookVisit, href: bookHref }, ...telLink],
        suggestion: copy.bookingTitle,
        weight: 1,
      },
      BUILTIN_KEYWORDS.booking,
      "",
    ),
  ];

  const team = await listPublishedTeamSummaries(locale);
  const doctors = team.filter((m) => m.teamRole === "doctor");
  const embryologists = team.filter((m) => m.teamRole === "embryologist").length;
  const nurses = team.filter((m) => m.teamRole === "nurse").length;
  out.push(
    makeDoc(
      {
        key: "builtin:team",
        kind: "builtin",
        title: copy.teamTitle,
        text: [
          copy.teamSummary(doctors.length, embryologists, nurses),
          doctors.length ? `${copy.teamDoctors}: ${doctors.map((d) => d.title).join(", ")}.` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        links: [{ label: copy.meetTeam, href: `/${locale}/s/tim` }],
        suggestion: copy.teamTitle,
        weight: 1,
      },
      BUILTIN_KEYWORDS.team,
      "",
    ),
  );
  return out;
}

/** Javne stranice — svaki h2/h3 odjeljak je poseban dokument (precizniji odgovor). */
async function loadSitePages(locale: Locale): Promise<BotDoc[]> {
  const rows = await db
    .select({
      slug: sitePages.slug,
      locale: sitePageTranslations.locale,
      title: sitePageTranslations.title,
      body: sitePageTranslations.body,
    })
    .from(sitePages)
    .innerJoin(sitePageTranslations, eq(sitePageTranslations.pageId, sitePages.id))
    .where(and(eq(sitePages.published, true), eq(sitePages.unlisted, false)));

  const bySlug = new Map<string, Map<string, (typeof rows)[number]>>();
  for (const r of rows) {
    if (SKIP_PAGE_SLUGS.has(r.slug)) continue;
    const m = bySlug.get(r.slug) ?? new Map();
    m.set(r.locale, r);
    bySlug.set(r.slug, m);
  }

  const copy = CHATBOT_COPY[locale];
  const out: BotDoc[] = [];
  for (const [slug, m] of bySlug) {
    const t = m.get(locale)?.body?.trim() ? m.get(locale)! : m.get(defaultLocale);
    if (!t?.body) continue;
    const href = `/${locale}/s/${slug}`;
    for (const section of splitSections(t.title, t.body)) {
      out.push(
        makeDoc(
          {
            key: `page:${slug}`,
            kind: "page",
            title: section.title,
            text: section.text,
            links: [{ label: copy.readMore, href }],
            suggestion: null,
            weight: 0.9,
          },
          // Naslov stranice važi za sve njene odjeljke.
          t.title,
        ),
      );
    }
  }
  return out;
}

function splitSections(pageTitle: string, html: string): { title: string; text: string }[] {
  const parts = html.split(/(?=<h[23][\s>])/i);
  const out: { title: string; text: string }[] = [];
  for (const part of parts) {
    const heading = part.match(/^<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
    const headingText = heading ? htmlToText(heading[1] ?? "") : "";
    const text = htmlToText(heading ? part.slice(heading[0].length) : part);
    if (text.length < 40) continue;
    out.push({ title: headingText ? `${pageTitle}: ${headingText}` : pageTitle, text });
  }
  return out;
}

/** Objavljeni članci i profili tima — manja težina od stranica. */
async function loadPosts(locale: Locale): Promise<BotDoc[]> {
  const rows = await db
    .select({
      contentRole: posts.contentRole,
      locale: postTranslations.locale,
      postId: postTranslations.postId,
      slug: postTranslations.slug,
      title: postTranslations.title,
      excerpt: postTranslations.excerpt,
      body: postTranslations.body,
    })
    .from(posts)
    .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
    .where(eq(posts.published, true));

  const byPost = new Map<string, Map<string, (typeof rows)[number]>>();
  for (const r of rows) {
    const m = byPost.get(r.postId) ?? new Map();
    m.set(r.locale, r);
    byPost.set(r.postId, m);
  }

  const copy = CHATBOT_COPY[locale];
  const out: BotDoc[] = [];
  for (const m of byPost.values()) {
    const t = m.get(locale) ?? m.get(defaultLocale);
    if (!t) continue;
    const text = htmlToText(t.body ?? t.excerpt ?? "");
    if (text.length < 40) continue;
    out.push(
      makeDoc(
        {
          key: `post:${t.slug}`,
          kind: "post",
          title: t.title,
          text,
          links: [{ label: copy.readMore, href: `/${locale}/posts/${t.slug}` }],
          suggestion: null,
          weight: t.contentRole === "team" ? 0.9 : 0.7,
        },
        t.title,
      ),
    );
  }
  return out;
}
