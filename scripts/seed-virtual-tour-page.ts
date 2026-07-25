/**
 * Kreira (ili osvježava) stranicu „Virtuelna tura“ i link u headeru.
 *
 *   npm run seed:virtual-tour
 *
 * Idempotentno: stranica se prepoznaje po slugu, nav link po href-u.
 * Postojeći tekst se NE gazi — mijenja se samo ono što je prazno, da izmjene
 * iz admin panela ne budu izgubljene pri ponovnom pokretanju.
 */
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  navLinkTranslations,
  navLinks,
  sitePageTranslations,
  sitePages,
} from "@/lib/db/schema";
import { locales, type Locale } from "@/lib/i18n";
import { resolveVirtualTourEmbedUrl } from "@/lib/virtual-tour-embed";

const SLUG = "virtuelna-tura";
const HREF = `/s/${SLUG}`;
/** Google Street View tura ambulante (Budva) — vidi lib/virtual-tour-embed.ts. */
const TOUR_SOURCE_URL = "https://maps.app.goo.gl/wgnXVUr5tBoGNXKs9";
/** Ispred „Kontakt“ (37), iza „Prezervacija fertilnosti“ (33). */
const NAV_SORT_ORDER = 36;

const pageCopy: Record<Locale, { title: string; body: string }> = {
  me: {
    title: "Virtuelna tura",
    body:
      "<p>Prošetajte kroz naš centar prije prve posjete. Tura je snimljena u punih 360°, " +
      "pa možete pogledati čekaonicu, ordinacije i laboratoriju iz svakog ugla — bez " +
      "zakazivanja i bez žurbe.</p>",
  },
  en: {
    title: "Virtual tour",
    body:
      "<p>Walk through our centre before your first visit. The tour is captured in full 360°, " +
      "so you can explore the waiting area, consulting rooms and laboratory from every angle — " +
      "at your own pace.</p>",
  },
  ru: {
    title: "Виртуальный тур",
    body:
      "<p>Пройдитесь по нашему центру перед первым визитом. Тур снят в формате 360°, поэтому " +
      "вы можете осмотреть зону ожидания, кабинеты и лабораторию со всех сторон — " +
      "в своём темпе.</p>",
  },
};

const navLabels: Record<Locale, string> = {
  me: "Virtuelna tura",
  en: "Virtual tour",
  ru: "Виртуальный тур",
};

async function upsertPage(embedUrl: string): Promise<string> {
  const [existing] = await db
    .select({ id: sitePages.id, tour: sitePages.virtualTourEmbedUrl })
    .from(sitePages)
    .where(eq(sitePages.slug, SLUG))
    .limit(1);

  if (existing) {
    await db
      .update(sitePages)
      .set({
        published: true,
        unlisted: false,
        virtualTourEmbedUrl: embedUrl,
        updatedAt: new Date(),
      })
      .where(eq(sitePages.id, existing.id));
    console.log(`[seed-virtual-tour] stranica /${SLUG} postoji — tura osvježena`);
    return existing.id;
  }

  const pageId = randomUUID();
  const now = new Date();
  await db.insert(sitePages).values({
    id: pageId,
    slug: SLUG,
    headerNavGroup: null,
    published: true,
    unlisted: false,
    questionnaireEmbedUrl: null,
    virtualTourEmbedUrl: embedUrl,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`[seed-virtual-tour] stranica /${SLUG} kreirana`);
  return pageId;
}

async function upsertTranslations(pageId: string): Promise<void> {
  for (const loc of locales) {
    const copy = pageCopy[loc];
    const [row] = await db
      .select({ id: sitePageTranslations.id, body: sitePageTranslations.body })
      .from(sitePageTranslations)
      .where(
        and(
          eq(sitePageTranslations.pageId, pageId),
          eq(sitePageTranslations.locale, loc),
        ),
      )
      .limit(1);

    if (row) {
      // Tekst iz admina ima prioritet; dopuni samo ako je prazan.
      if (!row.body?.trim()) {
        await db
          .update(sitePageTranslations)
          .set({ title: copy.title, body: copy.body })
          .where(eq(sitePageTranslations.id, row.id));
        console.log(`[seed-virtual-tour] ${loc}: prazan sadržaj popunjen`);
      } else {
        console.log(`[seed-virtual-tour] ${loc}: postojeći sadržaj sačuvan`);
      }
      continue;
    }

    await db.insert(sitePageTranslations).values({
      id: randomUUID(),
      pageId,
      locale: loc,
      title: copy.title,
      body: copy.body,
    });
    console.log(`[seed-virtual-tour] ${loc}: prevod dodat`);
  }
}

async function upsertNavLink(): Promise<void> {
  const [existing] = await db
    .select({ id: navLinks.id })
    .from(navLinks)
    .where(and(eq(navLinks.href, HREF), eq(navLinks.placement, "header")))
    .limit(1);

  const linkId = existing?.id ?? randomUUID();

  if (existing) {
    await db
      .update(navLinks)
      .set({ visible: true, updatedAt: new Date() })
      .where(eq(navLinks.id, linkId));
    console.log("[seed-virtual-tour] nav link postoji — ostavljen na mjestu");
  } else {
    await db.insert(navLinks).values({
      id: linkId,
      parentId: null,
      sortOrder: NAV_SORT_ORDER,
      href: HREF,
      visible: true,
      placement: "header",
      footerColumn: 0,
      updatedAt: new Date(),
    });
    console.log(`[seed-virtual-tour] nav link ${HREF} dodat (sort ${NAV_SORT_ORDER})`);
  }

  for (const loc of locales) {
    const [tr] = await db
      .select({ id: navLinkTranslations.id })
      .from(navLinkTranslations)
      .where(
        and(
          eq(navLinkTranslations.navLinkId, linkId),
          eq(navLinkTranslations.locale, loc),
        ),
      )
      .limit(1);
    if (tr) continue;
    await db.insert(navLinkTranslations).values({
      id: randomUUID(),
      navLinkId: linkId,
      locale: loc,
      label: navLabels[loc],
    });
    console.log(`[seed-virtual-tour] nav label ${loc}: ${navLabels[loc]}`);
  }
}

async function main() {
  const embedUrl = await resolveVirtualTourEmbedUrl(TOUR_SOURCE_URL);
  if (!embedUrl) {
    throw new Error(
      `Nije moguce razrijesiti link ture: ${TOUR_SOURCE_URL}. ` +
        "Provjeri internet konekciju ili zalijepi vec razrijesen /maps/embed URL.",
    );
  }
  console.log("[seed-virtual-tour] embed URL:", embedUrl);

  const pageId = await upsertPage(embedUrl);
  await upsertTranslations(pageId);
  await upsertNavLink();

  console.log("[seed-virtual-tour] gotovo — /me/s/" + SLUG);
  process.exit(0);
}

main().catch((e) => {
  console.error("[seed-virtual-tour] FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
