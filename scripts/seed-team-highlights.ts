import "./load-dotenv";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../lib/db";
import {
  homeTeamHighlightTranslations,
  homeTeamHighlights,
  sitePageTranslations,
  sitePages,
} from "../lib/db/schema";
import type { Locale } from "../lib/i18n";
import { locales } from "../lib/i18n";

const PLACEHOLDER_BODY_ME = `<p><em>Privremeni tekst — zamijenite u adminu (Stranice CMS).</em></p>
<p>Ovdje možete opisati pristup, dijagnostiku, podršku ili drugu temu u nekoliko pasusa. Dodajte podnaslove, liste i linkove prema drugim uslugama.</p>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse potenti. Integer at urna non neque facilisis volutpat.</p>`;

const PLACEHOLDER_BODY_EN = `<p><em>Placeholder — replace in admin (CMS Pages).</em></p>
<p>Describe your approach, diagnostics, support, or another topic in several paragraphs.</p>`;

type SeedPage = {
  slug: string;
  titles: Record<Locale, string>;
  bodies: Record<Locale, string>;
};

type SeedHighlight = {
  id: string;
  sortOrder: number;
  href: string;
  titles: Record<Locale, string>;
  teasers: Record<Locale, string>;
  page: SeedPage;
};

const HIGHLIGHTS: SeedHighlight[] = [
  {
    id: "a1000001-0001-4001-8001-000000000001",
    sortOrder: 1,
    href: "/s/tim-individualan-pristup",
    titles: {
      me: "Individualan pristup",
      en: "Individual approach",
      ru: "Индивидуальный подход",
      tr: "Bireysel yaklaşım",
    },
    teasers: {
      me: "Plan prilagođen vašim potrebama i tempu.",
      en: "A plan tailored to your needs and pace.",
      ru: "План, адаптированный к вашим потребностям.",
      tr: "İhtiyaçlarınıza ve temponuza uygun plan.",
    },
    page: {
      slug: "tim-individualan-pristup",
      titles: {
        me: "Individualan pristup",
        en: "Individual approach",
        ru: "Индивидуальный подход",
        tr: "Bireysel yaklaşım",
      },
      bodies: {
        me: PLACEHOLDER_BODY_ME,
        en: PLACEHOLDER_BODY_EN,
        ru: PLACEHOLDER_BODY_ME,
        tr: PLACEHOLDER_BODY_ME,
      },
    },
  },
  {
    id: "a1000001-0001-4001-8001-000000000002",
    sortOrder: 2,
    href: "/s/tim-savremena-dijagnostika",
    titles: {
      me: "Savremena dijagnostika",
      en: "Modern diagnostics",
      ru: "Современная диагностика",
      tr: "Modern tanı",
    },
    teasers: {
      me: "Laboratorij i protokoli po međunarodnim smjernicama.",
      en: "Laboratory and protocols aligned with international guidelines.",
      ru: "Лаборатория и протоколы по международным стандартам.",
      tr: "Uluslararası yönergelere uygun laboratuvar ve protokoller.",
    },
    page: {
      slug: "tim-savremena-dijagnostika",
      titles: {
        me: "Savremena dijagnostika",
        en: "Modern diagnostics",
        ru: "Современная диагностика",
        tr: "Modern tanı",
      },
      bodies: {
        me: PLACEHOLDER_BODY_ME,
        en: PLACEHOLDER_BODY_EN,
        ru: PLACEHOLDER_BODY_ME,
        tr: PLACEHOLDER_BODY_ME,
      },
    },
  },
  {
    id: "a1000001-0001-4001-8001-000000000003",
    sortOrder: 3,
    href: "/s/tim-diskrecija-podrska",
    titles: {
      me: "Diskrecija i podrška",
      en: "Discretion and support",
      ru: "Конфиденциальность и поддержка",
      tr: "Gizlilik ve destek",
    },
    teasers: {
      me: "Prostor osmišljen da se osjećate sigurno.",
      en: "A space designed for you to feel safe.",
      ru: "Пространство, где вы чувствуете себя в безопасности.",
      tr: "Kendinizi güvende hissetmeniz için tasarlanmış ortam.",
    },
    page: {
      slug: "tim-diskrecija-podrska",
      titles: {
        me: "Diskrecija i podrška",
        en: "Discretion and support",
        ru: "Конфиденциальность и поддержка",
        tr: "Gizlilik ve destek",
      },
      bodies: {
        me: PLACEHOLDER_BODY_ME,
        en: PLACEHOLDER_BODY_EN,
        ru: PLACEHOLDER_BODY_ME,
        tr: PLACEHOLDER_BODY_ME,
      },
    },
  },
];

async function ensurePage(page: SeedPage): Promise<void> {
  const [existing] = await db
    .select({ id: sitePages.id })
    .from(sitePages)
    .where(eq(sitePages.slug, page.slug))
    .limit(1);

  const pageId = existing?.id ?? randomUUID();
  const now = new Date();

  if (!existing) {
    await db.insert(sitePages).values({
      id: pageId,
      slug: page.slug,
      headerNavGroup: null,
      published: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const loc of locales) {
    const title = page.titles[loc];
    const body = page.bodies[loc];

    const [match] = await db
      .select({ id: sitePageTranslations.id, body: sitePageTranslations.body })
      .from(sitePageTranslations)
      .where(
        and(
          eq(sitePageTranslations.pageId, pageId),
          eq(sitePageTranslations.locale, loc),
        ),
      )
      .limit(1);

    if (match) {
      if (!match.body?.trim()) {
        await db
          .update(sitePageTranslations)
          .set({ title, body })
          .where(eq(sitePageTranslations.id, match.id));
      }
    } else {
      await db.insert(sitePageTranslations).values({
        id: randomUUID(),
        pageId,
        locale: loc,
        title,
        body,
      });
    }
  }
}

async function ensureHighlight(h: SeedHighlight): Promise<void> {
  await ensurePage(h.page);

  const [existing] = await db
    .select({ id: homeTeamHighlights.id })
    .from(homeTeamHighlights)
    .where(eq(homeTeamHighlights.id, h.id))
    .limit(1);

  const now = new Date();
  if (!existing) {
    await db.insert(homeTeamHighlights).values({
      id: h.id,
      sortOrder: h.sortOrder,
      href: h.href,
      visible: true,
      updatedAt: now,
    });
  }

  for (const loc of locales) {
    const [match] = await db
      .select({ id: homeTeamHighlightTranslations.id })
      .from(homeTeamHighlightTranslations)
      .where(
        and(
          eq(homeTeamHighlightTranslations.highlightId, h.id),
          eq(homeTeamHighlightTranslations.locale, loc),
        ),
      )
      .limit(1);

    if (match) {
      await db
        .update(homeTeamHighlightTranslations)
        .set({ title: h.titles[loc], teaser: h.teasers[loc] })
        .where(eq(homeTeamHighlightTranslations.id, match.id));
    } else {
      await db.insert(homeTeamHighlightTranslations).values({
        id: randomUUID(),
        highlightId: h.id,
        locale: loc,
        title: h.titles[loc],
        teaser: h.teasers[loc],
      });
    }
  }
}

async function main() {
  for (const h of HIGHLIGHTS) {
    await ensureHighlight(h);
  }
  console.log(`Seeded ${HIGHLIGHTS.length} team highlight cards + CMS pages.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
