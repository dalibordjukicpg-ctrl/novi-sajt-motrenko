import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

/** Jedinstveni ključevi za `site_locale_strings.field_key`. */
export const SITE_STRING_KEYS = [
  "org.brand",
  "org.subtitle",
  "header.cta_book",

  "hero.line1",
  "hero.line2",
  "hero.rotate.1",
  "hero.rotate.2",
  "hero.rotate.3",
  "hero.rotate.4",
  "hero.subtitle",
  "hero.cta_primary",
  "hero.cta_secondary",

  "stat1.value",
  "stat1.label",
  "stat2.value",
  "stat2.label",
  "stat3.value",
  "stat3.label",
  "stat4.value",
  "stat4.label",

  "section.services_title",
  "section.services_subtitle",
  "section.about_title",
  "section.about_lead",
  "section.news_title",

  "footer.tagline",
  "footer.hours_title",
  "footer.nav_title",

  "contact.phone1",
  "contact.phone2",
  "contact.email",
  "contact.address",

  "social.facebook",
  "social.instagram",
  "social.linkedin",

  "hours.mon_fri",
  "hours.tuesday",
  "hours.sat",
  "hours.sun",
] as const;

export type SiteStringKey = (typeof SITE_STRING_KEYS)[number];

export const SITE_STRING_LABELS: Record<SiteStringKey, string> = {
  "org.brand": "Naziv brenda (logo)",
  "org.subtitle": "Kratak opis ispod brenda",
  "header.cta_book": "Dugme u headeru (npr. Zakaži)",

  "hero.line1": "Hero — prvi red naslova",
  "hero.line2": "Hero — drugi red / naglašeni",
  "hero.rotate.1": "Hero — rotirajući tekst 1 (banner)",
  "hero.rotate.2": "Hero — rotirajući tekst 2",
  "hero.rotate.3": "Hero — rotirajući tekst 3",
  "hero.rotate.4": "Hero — rotirajući tekst 4",
  "hero.subtitle": "Hero — podnaslov",
  "hero.cta_primary": "Hero — primarno dugme",
  "hero.cta_secondary": "Hero — sekundarno dugme",

  "stat1.value": "Stat 1 — broj",
  "stat1.label": "Stat 1 — opis",
  "stat2.value": "Stat 2 — broj",
  "stat2.label": "Stat 2 — opis",
  "stat3.value": "Stat 3 — broj",
  "stat3.label": "Stat 3 — opis",
  "stat4.value": "Stat 4 — broj",
  "stat4.label": "Stat 4 — opis",

  "section.services_title": "Blok usluga — naslov",
  "section.services_subtitle": "Blok usluga — podnaslov",
  "section.about_title": "O nama — naslov",
  "section.about_lead": "O nama — uvod",
  "section.news_title": "Novosti / blog — naslov",

  "footer.tagline": "Footer — tekst ispod loga",
  "footer.hours_title": "Footer — naslov radno vrijeme",
  "footer.nav_title": "Footer — naslov navigacije",

  "contact.phone1": "Telefon 1",
  "contact.phone2": "Telefon 2",
  "contact.email": "Email",
  "contact.address": "Adresa (jedan red)",

  "social.facebook": "Facebook URL",
  "social.instagram": "Instagram URL",
  "social.linkedin": "LinkedIn URL",

  "hours.mon_fri": "Radno vrijeme Ponedjeljak–Petak",
  "hours.tuesday": "Utorak (ako različito)",
  "hours.sat": "Subota",
  "hours.sun": "Nedjelja",
};

type Defaults = Record<Locale, Record<SiteStringKey, string>>;

/** Početni sadržaj inspirišan humanom reprodukcijom / prezentacionim kliničkim sajtom. */
export const SITE_STRING_DEFAULTS: Defaults = {
  me: {
    "org.brand": "Human Reproduction Center Budva",
    "org.subtitle": "Centar za humanu reprodukciju",
    "header.cta_book": "Zakaži pregled",

    "hero.line1": "Gdje život počinje",
    "hero.line2": "savremena reproduktivna medicina",
    "hero.rotate.1": "Savremena tehnologija i laboratorij",
    "hero.rotate.2": "Stručnjaci posvećeni vašem rezultatu",
    "hero.rotate.3": "Iskustvo na kojem možete računati",
    "hero.rotate.4": "Njega i poverenje na prvom mjestu",
    "hero.subtitle":
      "Napredna reproduktivna medicina za vašu porodicu. Individualizovan pristup i savremena oprema.",
    "hero.cta_primary": "Zakaži pregled",
    "hero.cta_secondary": "Naše usluge",

    "stat1.value": "98%",
    "stat1.label": "Godišnja stopa zadovoljstva pacijenata",
    "stat2.value": "1000+",
    "stat2.label": "Rođene djece u našoj misiji",
    "stat3.value": "5000+",
    "stat3.label": "Tretiranih pacijenata",
    "stat4.value": "15+",
    "stat4.label": "Specijalista u multidisciplinarnom timu",

    "section.services_title": "Tretmani i opcije",
    "section.services_subtitle":
      "Sveobuhvatna medicinska njega u jednoj ustanovi, od dijagnostike do tretmana i pratnje.",
    "section.about_title": "Naša priča",
    "section.about_lead":
      "Posvećeni ste najnovijim dostignućima u reproduktivnoj medicini uz human pristup i jasnu komunikaciju.",
    "section.news_title": "Novosti iz centra i nauke",

    "footer.tagline":
      "Posvećeni vašem zdravlju uz savremenu medicinsku njegu i individualizovan pristup od 2004. godine.",
    "footer.hours_title": "Radno vrijeme",
    "footer.nav_title": "Navigacija",

    "contact.phone1": "033 402 432",
    "contact.phone2": "067 052 052",
    "contact.email": "info@humanareprodukcija.com",
    "contact.address": "bb XVI Ulica, Budva 85310",

    "social.facebook": "https://facebook.com",
    "social.instagram": "https://instagram.com",
    "social.linkedin": "https://linkedin.com",

    "hours.mon_fri": "08:00 – 20:00",
    "hours.tuesday": "06:30 – 20:00",
    "hours.sat": "Zatvoreno",
    "hours.sun": "Zatvoreno",
  },
  en: {
    "org.brand": "Human Reproduction Center Budva",
    "org.subtitle": "Centre for human reproduction",
    "header.cta_book": "Book a consultation",

    "hero.line1": "Where life begins",
    "hero.line2": "advanced reproductive medicine",
    "hero.rotate.1": "Cutting-edge technology and lab excellence",
    "hero.rotate.2": "Experts dedicated to your outcome",
    "hero.rotate.3": "Proven experience you can trust",
    "hero.rotate.4": "Care and trust come first",
    "hero.subtitle":
      "Advanced reproductive medicine for your family. Personalised care and modern technology.",
    "hero.cta_primary": "Book a consultation",
    "hero.cta_secondary": "Our services",

    "stat1.value": "98%",
    "stat1.label": "Annual patient satisfaction",
    "stat2.value": "1000+",
    "stat2.label": "Babies born through our mission",
    "stat3.value": "5000+",
    "stat3.label": "Patients treated",
    "stat4.value": "15+",
    "stat4.label": "Specialists in a multidisciplinary team",

    "section.services_title": "Treatments and services",
    "section.services_subtitle":
      "Comprehensive medical care in one centre — from diagnosis to treatment and follow-up.",
    "section.about_title": "Our story",
    "section.about_lead":
      "We combine advances in reproductive medicine with a humane, patient-centred approach.",
    "section.news_title": "News from the centre and science",

    "footer.tagline":
      "Dedicated to your wellbeing with modern medical care and an individualised approach since 2004.",
    "footer.hours_title": "Opening hours",
    "footer.nav_title": "Navigation",

    "contact.phone1": "033 402 432",
    "contact.phone2": "067 052 052",
    "contact.email": "info@humanareprodukcija.com",
    "contact.address": "bb XVI Ulica, Budva 85310",

    "social.facebook": "https://facebook.com",
    "social.instagram": "https://instagram.com",
    "social.linkedin": "https://linkedin.com",

    "hours.mon_fri": "08:00 – 20:00",
    "hours.tuesday": "06:30 – 20:00",
    "hours.sat": "Closed",
    "hours.sun": "Closed",
  },
  ru: {
    "org.brand": "Human Reproduction Center Budva",
    "org.subtitle": "Центр гуманной репродукции",
    "header.cta_book": "Записаться на приём",

    "hero.line1": "Где начинается жизнь",
    "hero.line2": "современная репродуктивная медицина",
    "hero.rotate.1": "Современные технологии и лаборатория",
    "hero.rotate.2": "Специалисты, сфокусированные на результате",
    "hero.rotate.3": "Опыт, на который можно опереться",
    "hero.rotate.4": "Забота и доверие прежде всего",
    "hero.subtitle":
      "Современная репродуктивная медицина для вашей семьи. Индивидуальный подход и новейшее оборудование.",
    "hero.cta_primary": "Записаться",
    "hero.cta_secondary": "Наши услуги",

    "stat1.value": "98%",
    "stat1.label": "Годовая удовлетворённость пациентов",
    "stat2.value": "1000+",
    "stat2.label": "Рождённых детей",
    "stat3.value": "5000+",
    "stat3.label": "Обследованных пациентов",
    "stat4.value": "15+",
    "stat4.label": "Специалистов в команде",

    "section.services_title": "Лечение и услуги",
    "section.services_subtitle":
      "Комплексная медицинская помощь в одном центре: диагностика, лечение и сопровождение.",
    "section.about_title": "О нас",
    "section.about_lead":
      "Мы сочетаем передовые методы репродуктивной медицины с человечным отношением к пациентам.",
    "section.news_title": "Новости",

    "footer.tagline":
      "Забота о вашем здоровье с современной медициной и индивидуальным подходом с 2004 года.",
    "footer.hours_title": "Часы работы",
    "footer.nav_title": "Навигация",

    "contact.phone1": "033 402 432",
    "contact.phone2": "067 052 052",
    "contact.email": "info@humanareprodukcija.com",
    "contact.address": "bb XVI Ulica, Budva 85310",

    "social.facebook": "https://facebook.com",
    "social.instagram": "https://instagram.com",
    "social.linkedin": "https://linkedin.com",

    "hours.mon_fri": "08:00 – 20:00",
    "hours.tuesday": "06:30 – 20:00",
    "hours.sat": "Выходной",
    "hours.sun": "Выходной",
  },
  tr: {
    "org.brand": "Human Reproduction Center Budva",
    "org.subtitle": "İnsan üremesi merkezi",
    "header.cta_book": "Randevu al",

    "hero.line1": "Hayatın başladığı yer",
    "hero.line2": "ileri üreme tıbbı",
    "hero.rotate.1": "Son teknoloji ve laboratuvar kalitesi",
    "hero.rotate.2": "Sonuca odaklı uzman ekip",
    "hero.rotate.3": "Güvenilir deneyim",
    "hero.rotate.4": "Önce bakım ve güven",
    "hero.subtitle":
      "Aileniz için ileri üreme tıbbı. Kişiselleştirilmiş yaklaşım ve modern teknoloji.",
    "hero.cta_primary": "Randevu al",
    "hero.cta_secondary": "Hizmetlerimiz",

    "stat1.value": "%98",
    "stat1.label": "Yıllık hasta memnuniyeti",
    "stat2.value": "1000+",
    "stat2.label": "Doğan bebek",
    "stat3.value": "5000+",
    "stat3.label": "Tedavi gören hasta",
    "stat4.value": "15+",
    "stat4.label": "Uzman hekim",

    "section.services_title": "Tedavi ve hizmetler",
    "section.services_subtitle":
      "Tanıdan tedaviye tek merkezde kapsayıcı tıbbi bakım.",
    "section.about_title": "Hikayemiz",
    "section.about_lead":
      "Üreme tıbbındaki yenilikleri insana yakın bir yaklaşımla birleştiriyoruz.",
    "section.news_title": "Haberler",

    "footer.tagline":
      "2004’ten beri modern tıbbi bakım ve kişiselleştirilmiş yaklaşım.",
    "footer.hours_title": "Çalışma saatleri",
    "footer.nav_title": "Menü",

    "contact.phone1": "033 402 432",
    "contact.phone2": "067 052 052",
    "contact.email": "info@humanareprodukcija.com",
    "contact.address": "bb XVI Ulica, Budva 85310",

    "social.facebook": "https://facebook.com",
    "social.instagram": "https://instagram.com",
    "social.linkedin": "https://linkedin.com",

    "hours.mon_fri": "08:00 – 20:00",
    "hours.tuesday": "06:30 – 20:00",
    "hours.sat": "Kapalı",
    "hours.sun": "Kapalı",
  },
};

export function allSiteStringKeys(): SiteStringKey[] {
  return [...SITE_STRING_KEYS];
}

export function localesList(): readonly Locale[] {
  return locales;
}

/** Grupe polja za admin „Sadržaj stranica“ (jedna forma, tabovi po jeziku). */
export const SITE_STRING_GROUPS = {
  headerFooter: [
    "org.brand",
    "org.subtitle",
    "header.cta_book",
    "footer.tagline",
    "footer.hours_title",
    "footer.nav_title",
    "contact.phone1",
    "contact.phone2",
    "contact.email",
    "contact.address",
    "social.facebook",
    "social.instagram",
    "social.linkedin",
    "hours.mon_fri",
    "hours.tuesday",
    "hours.sat",
    "hours.sun",
  ] as const satisfies readonly SiteStringKey[],

  hero: [
    "hero.line1",
    "hero.line2",
    "hero.rotate.1",
    "hero.rotate.2",
    "hero.rotate.3",
    "hero.rotate.4",
    "hero.subtitle",
    "hero.cta_primary",
    "hero.cta_secondary",
  ] as const satisfies readonly SiteStringKey[],

  sections: [
    "stat1.value",
    "stat1.label",
    "stat2.value",
    "stat2.label",
    "stat3.value",
    "stat3.label",
    "stat4.value",
    "stat4.label",
    "section.services_title",
    "section.services_subtitle",
    "section.about_title",
    "section.about_lead",
    "section.news_title",
  ] as const satisfies readonly SiteStringKey[],
} as const;

export type SiteStringGroupId = keyof typeof SITE_STRING_GROUPS;
