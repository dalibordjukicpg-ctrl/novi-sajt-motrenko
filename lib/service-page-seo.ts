import type { Locale } from "@/lib/i18n";

type ServiceSeo = { title: string; description: string };

const ME: Record<string, ServiceSeo> = {
  ivf: {
    title: "IVF (in vitro oplodnjenje) | Human Reproduction Center Budva",
    description:
      "IVF program u Budvi — individualan protokol stimulacije, embriologija i podrška tima od prve konsultacije do transfera. Zakažite pregled.",
  },
  iui: {
    title: "IUI (intrauterina inseminacija) | Human Reproduction Center Budva",
    description:
      "IUI tretman u Centru za humanu reprodukciju Budva. Dijagnostika, plan liječenja i praćenje ciklusa uz iskusnu kliničku podršku.",
  },
  "krioprezervacija-embriona-zamrzavanje-embriona-vitrifikacija-embriona": {
    title: "Krioprezervacija i vitrifikacija embriona | HRC Budva",
    description:
      "Sigurno zamrzavanje embriona i jajnih stanica — vitrifikacija, skladištenje i planiranje narednih ciklusa u Budvi.",
  },
  histeroskopija: {
    title: "Histeroskopija | Human Reproduction Center Budva",
    description:
      "Dijagnostička i operativna histeroskopija u Budvi — pregled uterine šupljine uz minimalnu invazivnost i brži oporavak.",
  },
  "stimulacija-ovulacije": {
    title: "Stimulacija ovulacije | Human Reproduction Center Budva",
    description:
      "Kontrolisana stimulacija ovulacije i praćenje ciklusa za parove koji pokušavaju prirodno ili pripremaju IUI/IVF tretman.",
  },
  pregledi: {
    title: "Pregledi i dijagnostika infertiliteta | HRC Budva",
    description:
      "Ginekološki i reproduktivni pregledi, ultrazvuk i plan dijagnostike infertiliteta — prvi korak ka jasnom planu liječenja.",
  },
  tim: {
    title: "Naš tim | Human Reproduction Center Budva",
    description:
      "Upoznajte tim Centra za humanu reprodukciju Budva — ginekologija, embriologija i multidisciplinarna podrška parovima.",
  },
  kontakt: {
    title: "Kontakt | Human Reproduction Center Budva",
    description:
      "Zakažite pregled, pozovite 033 402 432 ili 067 052 052, pošaljite dokumentaciju putem forme. Budva — Human Reproduction Center.",
  },
};

const EN: Record<string, ServiceSeo> = {
  ivf: {
    title: "IVF (in vitro fertilization) | Human Reproduction Center Budva",
    description:
      "IVF programme in Budva — tailored stimulation protocols, embryology and team support from first consultation to embryo transfer.",
  },
  iui: {
    title: "IUI (intrauterine insemination) | Human Reproduction Center Budva",
    description:
      "IUI treatment in Budva with diagnostics, treatment planning and cycle monitoring by an experienced clinical team.",
  },
  "krioprezervacija-embriona-zamrzavanje-embriona-vitrifikacija-embriona": {
    title: "Embryo cryopreservation & vitrification | HRC Budva",
    description:
      "Safe freezing of embryos and oocytes — vitrification, storage and planning of subsequent treatment cycles in Budva.",
  },
  histeroskopija: {
    title: "Hysteroscopy | Human Reproduction Center Budva",
    description:
      "Diagnostic and operative hysteroscopy in Budva — uterine cavity assessment with minimal invasiveness.",
  },
  "stimulacija-ovulacije": {
    title: "Ovulation stimulation | Human Reproduction Center Budva",
    description:
      "Controlled ovulation stimulation and cycle monitoring for couples trying naturally or preparing for IUI/IVF.",
  },
  pregledi: {
    title: "Fertility check-ups & diagnostics | HRC Budva",
    description:
      "Gynaecological and reproductive check-ups, ultrasound and infertility work-up — the first step to a clear treatment plan.",
  },
  tim: {
    title: "Our team | Human Reproduction Center Budva",
    description:
      "Meet the Human Reproduction Center Budva team — gynaecology, embryology and multidisciplinary support for couples.",
  },
  kontakt: {
    title: "Contact | Human Reproduction Center Budva",
    description:
      "Book a consultation, call +382 33 402 432 or +382 67 052 052, or send documentation via our contact form. Budva, Montenegro.",
  },
};

const RU: Record<string, ServiceSeo> = {
  ivf: {
    title: "ЭКО (экстракорпоральное оплодотворение) | Human Reproduction Center Budva",
    description:
      "Программа ЭКО в Будве — индивидуальный протокол стимуляции, эмбриология и поддержка команды от первой консультации до переноса.",
  },
  iui: {
    title: "ВМИ (внутриматочная инсеминация) | Human Reproduction Center Budva",
    description:
      "Лечение ВМИ в Будве: диагностика, план терапии и мониторинг цикла с опытной клинической поддержкой.",
  },
  "krioprezervacija-embriona-zamrzavanje-embriona-vitrifikacija-embriona": {
    title: "Криоконсервация и витрификация эмбрионов | HRC Budva",
    description:
      "Безопасное замораживание эмбрионов и яйцеклеток — витрификация, хранение и планирование следующих циклов.",
  },
  histeroskopija: {
    title: "Гистероскопия | Human Reproduction Center Budva",
    description:
      "Диагностическая и операционная гистероскопия в Будве — осмотр полости матки с минимальной инвазивностью.",
  },
  "stimulacija-ovulacije": {
    title: "Стимуляция овуляции | Human Reproduction Center Budva",
    description:
      "Контролируемая стимуляция овуляции и мониторинг цикла для пар, готовящихся к ВМИ/ЭКО или естественному зачатию.",
  },
  pregledi: {
    title: "Обследования и диагностика | HRC Budva",
    description:
      "Гинекологические и репродуктивные осмотры, УЗИ и диагностика бесплодия — первый шаг к плану лечения.",
  },
  tim: {
    title: "Наша команда | Human Reproduction Center Budva",
    description:
      "Команда Human Reproduction Center Budva — гинекология, эмбриология и мультидисциплинарная поддержка.",
  },
  kontakt: {
    title: "Контакты | Human Reproduction Center Budva",
    description:
      "Запишитесь на приём, позвоните +382 33 402 432 или +382 67 052 052, отправьте документы через форму. Будва.",
  },
};

const BY_LOCALE: Record<Locale, Record<string, ServiceSeo>> = {
  me: ME,
  en: EN,
  ru: RU,
};

export function getServicePageSeo(locale: Locale, slug: string): ServiceSeo | null {
  const key = slug.trim().toLowerCase();
  return BY_LOCALE[locale][key] ?? BY_LOCALE.me[key] ?? null;
}
