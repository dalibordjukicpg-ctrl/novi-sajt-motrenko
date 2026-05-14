import "./load-dotenv";

import { randomUUID } from "crypto";

import { db } from "../lib/db";
import {
  navLinkTranslations,
  navLinks,
  siteGlobals,
  siteLocaleStrings,
} from "../lib/db/schema";
import { SITE_GLOBALS_ROW_ID } from "../lib/queries/site-globals";
import type { Locale } from "../lib/i18n";
import { locales } from "../lib/i18n";
import {
  SITE_STRING_DEFAULTS,
  SITE_STRING_KEYS,
  type SiteStringKey,
} from "../lib/site-fields";

type NavDef = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  href: string;
  labels: Record<Locale, string>;
};

const I = {
  usluge: randomUUID(),
  inf: randomUUID(),
  iui: randomUUID(),
  gin: randomUUID(),
  onama: randomUUID(),
  tim: randomUUID(),
  blog: randomUUID(),
  kontakt: randomUUID(),
};

const NAV_DEFS: NavDef[] = [
  {
    id: I.usluge,
    parentId: null,
    sortOrder: 10,
    href: "#usluge",
    labels: {
      me: "Usluge",
      en: "Services",
      ru: "Услуги",
      tr: "Hizmetler",
    },
  },
  {
    id: I.inf,
    parentId: I.usluge,
    sortOrder: 10,
    href: "#usluge-inf",
    labels: {
      me: "Infertilitet i sterilitet",
      en: "Infertility",
      ru: "Бесплодие",
      tr: "İnfertilite",
    },
  },
  {
    id: I.iui,
    parentId: I.usluge,
    sortOrder: 20,
    href: "#usluge-iui",
    labels: {
      me: "IUI i IVF",
      en: "IUI & IVF",
      ru: "ИУИ и ЭКО",
      tr: "IUI ve IVF",
    },
  },
  {
    id: I.gin,
    parentId: I.usluge,
    sortOrder: 30,
    href: "#usluge-gin",
    labels: {
      me: "Ginekologija",
      en: "Gynaecology",
      ru: "Гинекология",
      tr: "Jinekoloji",
    },
  },
  {
    id: I.onama,
    parentId: null,
    sortOrder: 20,
    href: "#o-nama",
    labels: {
      me: "O nama",
      en: "About",
      ru: "О нас",
      tr: "Hakkımızda",
    },
  },
  {
    id: I.tim,
    parentId: null,
    sortOrder: 30,
    href: "#tim",
    labels: {
      me: "Naš tim",
      en: "Our team",
      ru: "Наша команда",
      tr: "Ekibimiz",
    },
  },
  {
    id: I.blog,
    parentId: null,
    sortOrder: 40,
    href: "#novosti",
    labels: {
      me: "Blog",
      en: "Blog",
      ru: "Блог",
      tr: "Blog",
    },
  },
  {
    id: I.kontakt,
    parentId: null,
    sortOrder: 50,
    href: "#kontakt",
    labels: {
      me: "Kontakt",
      en: "Contact",
      ru: "Контакт",
      tr: "İletişim",
    },
  },
];

async function seedStrings(): Promise<void> {
  const existing = await db
    .select({ id: siteLocaleStrings.id })
    .from(siteLocaleStrings)
    .limit(1);
  if (existing.length > 0) {
    console.log("site_locale_strings već ima podatke — preskačem tekstove.");
    return;
  }

  const now = new Date();
  const rows: {
    id: string;
    fieldKey: string;
    locale: Locale;
    value: string;
    updatedAt: Date;
  }[] = [];

  for (const loc of locales) {
    const block = SITE_STRING_DEFAULTS[loc];
    for (const key of SITE_STRING_KEYS) {
      rows.push({
        id: randomUUID(),
        fieldKey: key,
        locale: loc,
        value: block[key as SiteStringKey],
        updatedAt: now,
      });
    }
  }

  await db.insert(siteLocaleStrings).values(rows);
  console.log("Ubačeno", rows.length, "site_locale_strings redova.");
}

async function seedNav(): Promise<void> {
  const existing = await db.select({ id: navLinks.id }).from(navLinks).limit(1);
  if (existing.length > 0) {
    console.log("nav_links već postoje — preskačem navigaciju.");
    return;
  }

  const now = new Date();
  const linkRows = NAV_DEFS.map((n) => ({
    id: n.id,
    parentId: n.parentId,
    sortOrder: n.sortOrder,
    href: n.href,
    visible: true,
    updatedAt: now,
  }));

  await db.insert(navLinks).values(linkRows);

  const trans: {
    id: string;
    navLinkId: string;
    locale: Locale;
    label: string;
  }[] = [];
  for (const n of NAV_DEFS) {
    for (const loc of locales) {
      trans.push({
        id: randomUUID(),
        navLinkId: n.id,
        locale: loc,
        label: n.labels[loc],
      });
    }
  }
  await db.insert(navLinkTranslations).values(trans);
  console.log("Navigacija kreirana:", linkRows.length, "stavki.");
}

async function seedSiteGlobals(): Promise<void> {
  const existing = await db
    .select({ id: siteGlobals.id })
    .from(siteGlobals)
    .limit(1);
  if (existing.length > 0) {
    console.log("site_globals već postoji — preskačem.");
    return;
  }
  const now = new Date();
  await db.insert(siteGlobals).values({
    id: SITE_GLOBALS_ROW_ID,
    logoMediaId: null,
    faviconMediaId: null,
    heroBgMediaId: null,
    analyticsHeadHtml: "",
    analyticsBodyHtml: "",
    updatedAt: now,
  });
  console.log("Kreiran red site_globals.");
}

async function main() {
  await seedStrings();
  await seedNav();
  await seedSiteGlobals();
  console.log("Gotovo (seed:site).");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
