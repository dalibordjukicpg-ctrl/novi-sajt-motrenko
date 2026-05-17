import "./load-dotenv";

import { randomUUID } from "crypto";

import { and, eq } from "drizzle-orm";

import { db } from "../lib/db";
import {
  navLinkTranslations,
  navLinks,
  siteGlobals,
  siteLocaleStrings,
  sitePageTranslations,
  sitePages,
} from "../lib/db/schema";
import { LEGAL_PAGE_PRIVACY_BODY, LEGAL_PAGE_TERMS_BODY } from "../lib/legal-pages-me";
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
  onama: randomUUID(),
  onama_prica: randomUUID(),
  onama_tim: randomUUID(),
  usluge: randomUUID(),
  inf: randomUUID(),
  iui: randomUUID(),
  gine: randomUUID(),
  trud: randomUUID(),
  prez: randomUUID(),
  blog: randomUUID(),
  kontakt: randomUUID(),
};

const NAV_DEFS: NavDef[] = [
  {
    id: I.onama,
    parentId: null,
    sortOrder: 5,
    href: "#o-nama",
    labels: {
      me: "O nama",
    },
  },
  {
    id: I.onama_prica,
    parentId: I.onama,
    sortOrder: 6,
    href: "#o-nama",
    labels: {
      me: "Naša priča",
    },
  },
  {
    id: I.onama_tim,
    parentId: I.onama,
    sortOrder: 7,
    href: "#tim",
    labels: {
      me: "Naš tim",
    },
  },
  {
    id: I.usluge,
    parentId: null,
    sortOrder: 10,
    href: "#usluge",
    labels: {
      me: "Usluge",
    },
  },
  {
    id: I.inf,
    parentId: I.usluge,
    sortOrder: 10,
    href: "#usluge-inf",
    labels: {
      me: "Infertilitet i sterilitet",
    },
  },
  {
    id: I.iui,
    parentId: I.usluge,
    sortOrder: 20,
    href: "#usluge-iui",
    labels: {
      me: "IUI i IVF",
    },
  },
  {
    id: I.gine,
    parentId: I.usluge,
    sortOrder: 23,
    href: "#usluge-gine",
    labels: {
      me: "Ginekologija",
    },
  },
  {
    id: I.trud,
    parentId: I.usluge,
    sortOrder: 25,
    href: "#usluge-trud",
    labels: {
      me: "Trudnoća",
    },
  },
  {
    id: I.prez,
    parentId: I.usluge,
    sortOrder: 30,
    href: "#usluge-prez",
    labels: {
      me: "Prezervacija fertilnosti",
    },
  },
  {
    id: I.blog,
    parentId: null,
    sortOrder: 15,
    href: "#novosti",
    labels: {
      me: "Blog",
    },
  },
  {
    id: I.kontakt,
    parentId: null,
    sortOrder: 40,
    href: "#kontakt",
    labels: {
      me: "Kontakt",
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
    placement: "header" as const,
    footerColumn: 0,
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
    heroBgExternalUrl: null,
    teamM1MediaId: null,
    teamM2MediaId: null,
    teamM3MediaId: null,
    teamM4MediaId: null,
    analyticsHeadHtml: "",
    analyticsBodyHtml: "",
    maintenanceEnabled: false,
    maintenanceTitle: null,
    maintenanceMessage: null,
    maintenanceLogoMediaId: null,
    maintenanceBypassIps: null,
    updatedAt: now,
  });
  console.log("Kreiran red site_globals.");
}

/** Stranice Politika privatnosti i Uslovi korišćenja — uvijek idempotentno ažurira sadržaj za „me“. */
async function seedLegalPages(): Promise<void> {
  const defs = [
    {
      slug: "politika-privatnosti",
      title: "Politika privatnosti",
      body: LEGAL_PAGE_PRIVACY_BODY,
    },
    {
      slug: "uslovi-koriscenja",
      title: "Uslovi korišćenja",
      body: LEGAL_PAGE_TERMS_BODY,
    },
  ] as const;

  const now = new Date();

  for (const p of defs) {
    const [existing] = await db
      .select({ id: sitePages.id })
      .from(sitePages)
      .where(eq(sitePages.slug, p.slug))
      .limit(1);

    let pageId: string;

    if (!existing) {
      pageId = randomUUID();
      await db.insert(sitePages).values({
        id: pageId,
        slug: p.slug,
        headerNavGroup: null,
        published: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log("Kreirana stranica:", p.slug);
    } else {
      pageId = existing.id;
      await db
        .update(sitePages)
        .set({ published: true, updatedAt: now })
        .where(eq(sitePages.id, pageId));
    }

    for (const loc of locales) {
      const [row] = await db
        .select({ id: sitePageTranslations.id })
        .from(sitePageTranslations)
        .where(
          and(
            eq(sitePageTranslations.pageId, pageId),
            eq(sitePageTranslations.locale, loc),
          ),
        )
        .limit(1);

      if (row) {
        await db
          .update(sitePageTranslations)
          .set({ title: p.title, body: p.body })
          .where(eq(sitePageTranslations.id, row.id));
      } else {
        await db.insert(sitePageTranslations).values({
          id: randomUUID(),
          pageId,
          locale: loc,
          title: p.title,
          body: p.body,
        });
      }
    }
    console.log("Ažuriran sadržaj:", p.slug, "(" + locales.join(",") + ")");
  }
}

async function main() {
  await seedStrings();
  await seedNav();
  await seedSiteGlobals();
  await seedLegalPages();
  console.log("Gotovo (seed:site).");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
