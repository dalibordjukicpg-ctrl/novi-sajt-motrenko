import type { Locale } from "@/lib/i18n";

export type BookingIntakeLabels = {
  formEyebrow: string;
  formTitle: string;
  formLead: string;
  sectionBasic: string;
  sectionReasonVisit: string;
  fullName: string;
  email: string;
  phone: string;
  whoAttends: string;
  selectPlaceholder: string;
  whoAttendsOptions: Record<
    "patient_only" | "couple_both" | "with_partner",
    string
  >;
  partnerName: string;
  partnerPhone: string;
  whatBroughtYou: string;
  whatBroughtYouPh: string;
  tryingConceive: string;
  ttcUnset: string;
  ttcOptions: Record<
    "lt_6m" | "6_12m" | "12_24m" | "gt_24m" | "prefer_not" | "na",
    string
  >;
  consent: string;
  consentPrivacyPrefix: string;
  consentPrivacyLink: string;
  callOr: string;
  submit: string;
  submitting: string;
  successTitle: string;
  success: string;
  errorGeneric: string;
  errorValidation: string;
  consentRequired: string;
  partnerNameRequired: string;
  pdfMetaSubmitted: string;
  pdfMetaLanguage: string;
  pdfMetaReference: string;
  pdfDateOfBirth: string;
  pdfConsentSection: string;
  pdfConfirmation: string;
  pdfConsentConfirmed: string;
  pdfConsentMissing: string;
  pdfAttachmentNote: string;
};

const ME: BookingIntakeLabels = {
  formEyebrow: "Prijavnica za pregled",
  formTitle: "Zakažite konsultaciju",
  formLead:
    "Nekoliko kratkih odgovora pomaže našem timu da pripremi prvi susret sa ljekarom.",
  sectionBasic: "Osnovni podaci",
  sectionReasonVisit: "Razlog dolaska",
  fullName: "Ime i prezime",
  email: "Email",
  phone: "Telefon",
  whoAttends: "Ko dolazi na pregled?",
  selectPlaceholder: "— izaberite —",
  whoAttendsOptions: {
    patient_only: "Samo ja (pacijent/kinja)",
    couple_both: "Par (oba partnera)",
    with_partner: "Ja sa partnerom",
  },
  partnerName: "Ime partnera (ako dolazi)",
  partnerPhone: "Telefon partnera",
  whatBroughtYou: "Šta vas je dovelo na konsultaciju?",
  whatBroughtYouPh:
    "Npr. duži pokušaji začeća, preporuka za IVF, kontrola nakon gubitka trudnoće, drugo…",
  tryingConceive: "Koliko dugo aktivno pokušavate začeće?",
  ttcUnset: "— izaberite —",
  ttcOptions: {
    lt_6m: "Manje od 6 mjeseci",
    "6_12m": "6–12 mjeseci",
    "12_24m": "1–2 godine",
    gt_24m: "Duže od 2 godine",
    prefer_not: "Ne želim da odgovorim",
    na: "Nije primjenjivo / ne znam",
  },
  consent:
    "Saglasan/na sam da klinika obrađuje navedene podatke radi zakazivanja i pripreme pregleda, u skladu sa politikom privatnosti.",
  consentPrivacyPrefix: "Pročitajte",
  consentPrivacyLink: "politiku privatnosti",
  callOr: "Ili pozovite:",
  submit: "Pošalji prijavnicu",
  submitting: "Šaljem…",
  successTitle: "Uspješno ste zakazali termin",
  success:
    "Hvala. Primili smo prijavnicu. Javićemo vam se uskoro radi potvrde termina.",
  errorGeneric:
    "Slanje nije uspjelo. Pokušajte ponovo ili nas pozovite telefonom.",
  errorValidation: "Provjerite označena polja.",
  consentRequired:
    "Potrebno je prihvatiti obradu podataka (politika privatnosti).",
  partnerNameRequired: "Unesite ime partnera.",
  pdfMetaSubmitted: "Datum slanja",
  pdfMetaLanguage: "Jezik forme",
  pdfMetaReference: "Referenca / ID",
  pdfDateOfBirth: "Datum rođenja",
  pdfConsentSection: "Saglasnost",
  pdfConfirmation: "Potvrda",
  pdfConsentConfirmed:
    "Potvrđena saglasnost za obradu podataka radi zakazivanja i pripreme pregleda.",
  pdfConsentMissing: "Saglasnost nije zabilježena.",
  pdfAttachmentNote: "Puni pregled je u prilogu (PDF, A4 — spreman za štampu).",
};

const EN: BookingIntakeLabels = {
  formEyebrow: "Examination intake form",
  formTitle: "Request a consultation",
  formLead:
    "A few short answers help our team prepare for your first meeting with the doctor.",
  sectionBasic: "Basic details",
  sectionReasonVisit: "Reason for visit",
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  whoAttends: "Who is coming to the appointment?",
  selectPlaceholder: "— select —",
  whoAttendsOptions: {
    patient_only: "Just me (patient)",
    couple_both: "Both partners",
    with_partner: "Me with my partner",
  },
  partnerName: "Partner’s name (if applicable)",
  partnerPhone: "Partner’s phone",
  whatBroughtYou: "What brings you to this consultation?",
  whatBroughtYouPh:
    "e.g. long journey trying to conceive, referral for IVF, follow-up after pregnancy loss, other…",
  tryingConceive: "How long have you been actively trying to conceive?",
  ttcUnset: "— select —",
  ttcOptions: {
    lt_6m: "Less than 6 months",
    "6_12m": "6–12 months",
    "12_24m": "1–2 years",
    gt_24m: "More than 2 years",
    prefer_not: "Prefer not to say",
    na: "Not applicable / unsure",
  },
  consent:
    "I agree that the clinic may process this data to schedule and prepare my visit, as described in the privacy policy.",
  consentPrivacyPrefix: "Read the",
  consentPrivacyLink: "privacy policy",
  callOr: "Or call:",
  submit: "Submit intake form",
  submitting: "Sending…",
  successTitle: "Appointment request sent successfully",
  success:
    "Thank you. We received your form and will contact you shortly to confirm.",
  errorGeneric: "Something went wrong. Please try again or call us.",
  errorValidation: "Please check the highlighted fields.",
  consentRequired: "Please accept the privacy policy to submit.",
  partnerNameRequired: "Please enter your partner’s name.",
  pdfMetaSubmitted: "Submitted at",
  pdfMetaLanguage: "Form language",
  pdfMetaReference: "Reference / ID",
  pdfDateOfBirth: "Date of birth",
  pdfConsentSection: "Consent",
  pdfConfirmation: "Confirmation",
  pdfConsentConfirmed:
    "Consent confirmed for processing data to schedule and prepare the visit.",
  pdfConsentMissing: "Consent was not recorded.",
  pdfAttachmentNote: "Full details are attached (PDF, A4 — print-ready).",
};

const RU: BookingIntakeLabels = {
  formEyebrow: "Анкета перед приёмом",
  formTitle: "Запишитесь на консультацию",
  formLead:
    "Краткие ответы помогут команде подготовиться к первой встрече с врачом.",
  sectionBasic: "Основные данные",
  sectionReasonVisit: "Цель визита",
  fullName: "Фамилия и имя",
  email: "Email",
  phone: "Телефон",
  whoAttends: "Кто приходит на приём?",
  selectPlaceholder: "— выберите —",
  whoAttendsOptions: {
    patient_only: "Только я (пациент)",
    couple_both: "Пара (оба)",
    with_partner: "Я с партнёром",
  },
  partnerName: "Имя партнёра (если приходит)",
  partnerPhone: "Телефон партнёра",
  whatBroughtYou: "Что привело вас на консультацию?",
  whatBroughtYouPh:
    "Напр.: длительные попытки зачатия, направление на ЭКО, наблюдение после утраты беременности, другое…",
  tryingConceive: "Как долго вы активно пытаетесь зачать?",
  ttcUnset: "— выберите —",
  ttcOptions: {
    lt_6m: "Меньше 6 месяцев",
    "6_12m": "6–12 месяцев",
    "12_24m": "1–2 года",
    gt_24m: "Более 2 лет",
    prefer_not: "Предпочитаю не отвечать",
    na: "Не применимо / не знаю",
  },
  consent:
    "Я согласен(на) на обработку данных для записи и подготовки приёма, как указано в политике конфиденциальности.",
  consentPrivacyPrefix: "Ознакомьтесь с",
  consentPrivacyLink: "политикой конфиденциальности",
  callOr: "Или позвоните:",
  submit: "Отправить анкету",
  submitting: "Отправка…",
  successTitle: "Заявка успешно отправлена",
  success:
    "Спасибо. Мы получили анкету и скоро свяжемся для подтверждения.",
  errorGeneric: "Не удалось отправить. Попробуйте снова или позвоните.",
  errorValidation: "Проверьте выделенные поля.",
  consentRequired:
    "Нужно подтвердить согласие в соответствии с политикой конфиденциальности.",
  partnerNameRequired: "Введите имя партнёра.",
  pdfMetaSubmitted: "Дата отправки",
  pdfMetaLanguage: "Язык формы",
  pdfMetaReference: "Ссылка / ID",
  pdfDateOfBirth: "Дата рождения",
  pdfConsentSection: "Согласие",
  pdfConfirmation: "Подтверждение",
  pdfConsentConfirmed:
    "Подтверждено согласие на обработку данных для записи и подготовки приёма.",
  pdfConsentMissing: "Согласие не зафиксировано.",
  pdfAttachmentNote: "Полная анкета в приложении (PDF, A4 — готово к печати).",
};

const MAP: Record<Locale, BookingIntakeLabels> = {
  me: ME,
  en: EN,
  ru: RU,
};

export function getBookingIntakeLabels(locale: Locale): BookingIntakeLabels {
  return MAP[locale] ?? ME;
}
