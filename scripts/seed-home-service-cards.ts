import "./load-dotenv";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../lib/db";
import {
  homeServiceCardTranslations,
  homeServiceCards,
} from "../lib/db/schema";
import type { Locale } from "../lib/i18n";
import { locales } from "../lib/i18n";

type SeedCard = {
  id: string;
  sortOrder: number;
  iconName: string;
  href: string;
  titles: Record<Locale, string>;
  descriptions: Record<Locale, string>;
};

/** Fiksni ID-jevi — idempotentan upsert; isti sadržaj kao u setup-home-content.mjs */
export const HOME_SERVICE_CARDS_SEED: SeedCard[] = [
  {
    id: "b2000001-0001-4001-8001-000000000001",
    sortOrder: 1,
    iconName: "heart",
    href: "/s/dijagnosticke-metode-muskarac",
    titles: {
      me: "Infertilitet i sterilitet",
      en: "Infertility and sterility",
      ru: "Бесплодие и стерильность",
    },
    descriptions: {
      me: "Dijagnostičke metode — muškarac",
      en: "Diagnostic methods — male",
      ru: "Диагностические методы — мужчина",
    },
  },
  {
    id: "b2000001-0001-4001-8001-000000000002",
    sortOrder: 2,
    iconName: "flask-conical",
    href: "/s/stimulacija-ovulacije",
    titles: {
      me: "IUI",
      en: "IUI",
      ru: "ВМИ",
    },
    descriptions: {
      me: "Stimulacija ovulacije",
      en: "Ovulation stimulation",
      ru: "Стимуляция овуляции",
    },
  },
  {
    id: "b2000001-0001-4001-8001-000000000003",
    sortOrder: 3,
    iconName: "stethoscope",
    href: "/s/redovni-ginekoloski-pregled",
    titles: {
      me: "Ginekološke intervencije",
      en: "Gynecological procedures",
      ru: "Гинекологические вмешательства",
    },
    descriptions: {
      me: "Redovni ginekološki pregled",
      en: "Routine gynecological examination",
      ru: "Регулярный гинекологический осмотр",
    },
  },
  {
    id: "b2000001-0001-4001-8001-000000000004",
    sortOrder: 4,
    iconName: "baby",
    href: "/s/redovni-pregledi-trudnoce",
    titles: {
      me: "Redovni pregledi trudnoće",
      en: "Routine pregnancy check-ups",
      ru: "Регулярные осмотры при беременности",
    },
    descriptions: {
      me: "Praćenje trudnoće i savjetovanje",
      en: "Pregnancy monitoring and counselling",
      ru: "Наблюдение беременности и консультации",
    },
  },
  {
    id: "b2000001-0001-4001-8001-000000000005",
    sortOrder: 5,
    iconName: "microscope",
    href: "/s/krioprezervacija-embriona-zamrzavanje-embriona-vitrifikacija-embriona",
    titles: {
      me: "Krioprezervacija embriona — vitrifikacija",
      en: "Embryo cryopreservation — vitrification",
      ru: "Криоконсервация эмбрионов — витрификация",
    },
    descriptions: {
      me: "Prezervacija fertilnosti — muškarci",
      en: "Fertility preservation — male",
      ru: "Сохранение фертильности — мужчины",
    },
  },
  {
    id: "b2000001-0001-4001-8001-000000000006",
    sortOrder: 6,
    iconName: "gift",
    href: "/s/donacija-embriona",
    titles: {
      me: "Donacija embriona",
      en: "Embryo donation",
      ru: "Донация эмбрионов",
    },
    descriptions: {
      me: "Program donacije embriona",
      en: "Embryo donation programme",
      ru: "Программа донации эмбрионов",
    },
  },
];

export const HOME_SERVICE_CARD_SEED_IDS = HOME_SERVICE_CARDS_SEED.map((c) => c.id);

async function ensureCard(card: SeedCard): Promise<void> {
  const [existing] = await db
    .select({ id: homeServiceCards.id })
    .from(homeServiceCards)
    .where(eq(homeServiceCards.id, card.id))
    .limit(1);

  const now = new Date();
  if (!existing) {
    await db.insert(homeServiceCards).values({
      id: card.id,
      sortOrder: card.sortOrder,
      iconName: card.iconName,
      href: card.href,
      visible: true,
      updatedAt: now,
    });
  } else {
    await db
      .update(homeServiceCards)
      .set({
        sortOrder: card.sortOrder,
        iconName: card.iconName,
        href: card.href,
        visible: true,
        updatedAt: now,
      })
      .where(eq(homeServiceCards.id, card.id));
  }

  for (const loc of locales) {
    const [match] = await db
      .select({ id: homeServiceCardTranslations.id })
      .from(homeServiceCardTranslations)
      .where(
        and(
          eq(homeServiceCardTranslations.cardId, card.id),
          eq(homeServiceCardTranslations.locale, loc),
        ),
      )
      .limit(1);

    if (match) {
      await db
        .update(homeServiceCardTranslations)
        .set({
          title: card.titles[loc],
          description: card.descriptions[loc],
        })
        .where(eq(homeServiceCardTranslations.id, match.id));
    } else {
      await db.insert(homeServiceCardTranslations).values({
        id: randomUUID(),
        cardId: card.id,
        locale: loc,
        title: card.titles[loc],
        description: card.descriptions[loc],
      });
    }
  }
}

async function main() {
  for (const card of HOME_SERVICE_CARDS_SEED) {
    await ensureCard(card);
  }
  console.log(`Seeded ${HOME_SERVICE_CARDS_SEED.length} home service cards.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
