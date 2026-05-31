import type { Locale } from "@/lib/i18n";

export type ContactPdfLabels = {
  title: string;
  sectionUser: string;
  sectionContact: string;
  sectionReason: string;
  sectionConsent: string;
  fullName: string;
  email: string;
  phone: string;
  inquiryType: string;
  message: string;
  confirmation: string;
  consentConfirmed: string;
  consentMissing: string;
  metaSubmitted: string;
  metaLanguage: string;
  patientTranslation: string;
};

const ME: ContactPdfLabels = {
  title: "Kontakt upit sa veb prezentacije",
  sectionUser: "Podaci korisnika",
  sectionContact: "Kontakt",
  sectionReason: "Razlog javljanja",
  sectionConsent: "Saglasnost",
  fullName: "Ime i prezime",
  email: "E-mail",
  phone: "Telefon",
  inquiryType: "Tip upita / usluga",
  message: "Poruka",
  confirmation: "Potvrda",
  consentConfirmed: "Potvrđena saglasnost za obradu podataka radi odgovora na upit.",
  consentMissing: "Saglasnost nije zabilježena.",
  metaSubmitted: "Datum slanja",
  metaLanguage: "Jezik forme",
  patientTranslation: "Prevod (crnogorski)",
};

const EN: ContactPdfLabels = {
  title: "Contact inquiry from the website",
  sectionUser: "User details",
  sectionContact: "Contact",
  sectionReason: "Reason for contact",
  sectionConsent: "Consent",
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  inquiryType: "Inquiry type / service",
  message: "Message",
  confirmation: "Confirmation",
  consentConfirmed: "Consent confirmed for processing data to respond to this inquiry.",
  consentMissing: "Consent was not recorded.",
  metaSubmitted: "Submitted at",
  metaLanguage: "Form language",
  patientTranslation: "Translation (Montenegrin)",
};

const RU: ContactPdfLabels = {
  title: "Контактный запрос с сайта",
  sectionUser: "Данные пользователя",
  sectionContact: "Контакт",
  sectionReason: "Причина обращения",
  sectionConsent: "Согласие",
  fullName: "Фамилия и имя",
  email: "Email",
  phone: "Телефон",
  inquiryType: "Тип запроса / услуга",
  message: "Сообщение",
  confirmation: "Подтверждение",
  consentConfirmed: "Подтверждено согласие на обработку данных для ответа на запрос.",
  consentMissing: "Согласие не зафиксировано.",
  metaSubmitted: "Дата отправки",
  metaLanguage: "Язык формы",
  patientTranslation: "Перевод (черногорский)",
};

const MAP: Record<Locale, ContactPdfLabels> = {
  me: ME,
  en: EN,
  ru: RU,
};

export function getContactPdfLabels(locale: string): ContactPdfLabels {
  const key = locale.toLowerCase() as Locale;
  return MAP[key] ?? ME;
}

/** PDF klinici — uvijek crnogorski; `formLocale` ostaje u zaglavlju PDF-a. */
export function getContactStaffPdfLabels(): ContactPdfLabels {
  return ME;
}
