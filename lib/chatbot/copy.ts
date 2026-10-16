import type { Locale } from "@/lib/i18n";

/** Oblik imenice uz broj: 1 / 2–4 / 5+ (21 ljekar, 22 ljekara, 12 ljekara). */
function srPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Tekstovi chat prozora i ugrađenih odgovora po jeziku. */
export type ChatbotCopy = {
  greeting: string;
  tagline: string;
  status: string;
  openChat: string;
  closeChat: string;
  closeGreeting: string;
  notifications: string;
  placeholder: string;
  send: string;
  disclaimer: string;
  welcome: string;
  chips: { label: string; q: string }[];
  thinking: string;
  error: string;
  readMore: string;
  bookVisit: string;
  callUs: string;
  showMap: string;
  meetTeam: string;
  handoffButton: string;
  handoffTitle: string;
  handoffIntro: string;
  handoffName: string;
  handoffContact: string;
  handoffMessage: string;
  handoffConsent: string;
  handoffSend: string;
  handoffCancel: string;
  handoffThanks: string;
  handoffInvalid: string;
  maybeAlso: string;
  unknown: string;
  medical: string;
  emergency: string;
  smalltalkHello: string;
  smalltalkThanks: string;
  hoursTitle: string;
  hoursMonFri: string;
  hoursTuesday: string;
  hoursSat: string;
  hoursSun: string;
  locationTitle: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
  teamTitle: string;
  teamSummary: (doctors: number, embryologists: number, nurses: number) => string;
  teamDoctors: string;
  bookingTitle: string;
  bookingText: (phone: string) => string;
};

export const CHATBOT_COPY: Record<Locale, ChatbotCopy> = {
  me: {
    tagline: "Vaš vodič za reproduktivno zdravlje & potpomognutu oplodnju",
    greeting: "Hej, zdravo! 👋 Dobrodošli na naš sajt. Ukoliko imate pitanja, tu sam.",
    status: "Virtuelni asistent",
    openChat: "Otvori chat",
    closeChat: "Zatvori chat",
    closeGreeting: "Zatvori poruku",
    notifications: "Obavještenja",
    placeholder: "Napišite pitanje…",
    send: "Pošalji",
    disclaimer: "Ne dajem medicinske savjete. Molimo ne upisujte zdravstvene podatke u chat.",
    welcome: "Zdravo! Ja sam virtuelni asistent klinike. Pitajte me za radno vrijeme, lokaciju, cijene, naš tim ili zakazivanje.",
    chips: [
      { label: "Radno vrijeme", q: "radno vrijeme" },
      { label: "Lokacija", q: "gdje se nalazite" },
      { label: "Cjenovnik", q: "cjenovnik" },
      { label: "Naš tim", q: "ljekari" },
      { label: "Zakaži pregled", q: "zakazivanje termina" },
    ],
    thinking: "Tražim odgovor…",
    error: "Došlo je do greške. Pokušajte ponovo ili nas pozovite.",
    readMore: "Pročitajte više",
    bookVisit: "Zakažite pregled",
    callUs: "Pozovite nas",
    showMap: "Otvori mapu",
    meetTeam: "Upoznajte tim",
    handoffButton: "Pošalji poruku osoblju",
    handoffTitle: "Poruka osoblju klinike",
    handoffIntro: "Ostavite ime i kontakt — naše osoblje će vam se javiti.",
    handoffName: "Ime i prezime",
    handoffContact: "Telefon ili email",
    handoffMessage: "Vaše pitanje",
    handoffConsent: "Saglasan/na sam da klinika koristi ove podatke da mi odgovori.",
    handoffSend: "Pošalji",
    handoffCancel: "Odustani",
    handoffThanks: "Hvala! Poruka je poslata osoblju. Javićemo vam se što prije.",
    handoffInvalid: "Popunite ime, kontakt i pitanje, i potvrdite saglasnost.",
    maybeAlso: "Možda vas zanima:",
    unknown: "Nažalost, na to pitanje nemam odgovor. Možete ostaviti poruku našem osoblju i javićemo vam se, ili nas pozvati telefonom.",
    medical: "Ne mogu davati medicinske savjete niti tumačiti nalaze i terapiju — to može samo ljekar. Zakažite pregled ili ostavite poruku osoblju.",
    emergency: "Ako imate jako krvarenje, jak bol ili se osjećate loše, odmah pozovite 112 ili se javite u najbliži urgentni centar.",
    smalltalkHello: "Zdravo! 😊 Kako vam mogu pomoći?",
    smalltalkThanks: "Nema na čemu! Ako imate još pitanja, tu sam.",
    hoursTitle: "Radno vrijeme",
    hoursMonFri: "Ponedjeljak – petak",
    hoursTuesday: "Utorak",
    hoursSat: "Subota",
    hoursSun: "Nedjelja",
    locationTitle: "Lokacija",
    contactTitle: "Kontakt",
    contactPhone: "Telefon",
    contactEmail: "Email",
    teamTitle: "Naš tim",
    teamSummary: (d, e, n) =>
      `U našem timu su ${d} ${srPlural(d, "ljekar", "ljekara", "ljekara")}, ${e} ${srPlural(e, "embriolog", "embriologa", "embriologa")} i ${n} ${srPlural(n, "medicinska sestra", "medicinske sestre", "medicinskih sestara")}.`,
    teamDoctors: "Ljekari",
    bookingTitle: "Zakazivanje pregleda",
    bookingText: (phone) =>
      `Pregled možete zakazati preko forme na sajtu${phone ? ` ili telefonom na ${phone}` : ""}. Osoblje će potvrditi termin.`,
  },
  en: {
    tagline: "Your guide to reproductive health & assisted reproduction",
    greeting: "Hi there! 👋 Welcome to our website. If you have any questions, I'm here.",
    status: "Virtual assistant",
    openChat: "Open chat",
    closeChat: "Close chat",
    closeGreeting: "Dismiss message",
    notifications: "Notifications",
    placeholder: "Type your question…",
    send: "Send",
    disclaimer: "I don't give medical advice. Please don't share health details in the chat.",
    welcome: "Hello! I'm the clinic's virtual assistant. Ask me about opening hours, location, prices, our team or booking a visit.",
    chips: [
      { label: "Opening hours", q: "opening hours" },
      { label: "Location", q: "location address" },
      { label: "Prices", q: "prices" },
      { label: "Our team", q: "doctors" },
      { label: "Book a visit", q: "book appointment" },
    ],
    thinking: "Looking for an answer…",
    error: "Something went wrong. Please try again or call us.",
    readMore: "Read more",
    bookVisit: "Book a visit",
    callUs: "Call us",
    showMap: "Open map",
    meetTeam: "Meet the team",
    handoffButton: "Message our staff",
    handoffTitle: "Message to clinic staff",
    handoffIntro: "Leave your name and contact — our staff will get back to you.",
    handoffName: "Full name",
    handoffContact: "Phone or email",
    handoffMessage: "Your question",
    handoffConsent: "I agree that the clinic may use these details to reply to me.",
    handoffSend: "Send",
    handoffCancel: "Cancel",
    handoffThanks: "Thank you! Your message was sent to our staff. We'll get back to you soon.",
    handoffInvalid: "Please fill in name, contact and question, and confirm consent.",
    maybeAlso: "You may also be interested in:",
    unknown: "Sorry, I don't have an answer to that. You can leave a message for our staff and we'll get back to you, or give us a call.",
    medical: "I can't give medical advice or interpret test results and treatment — only a doctor can. Please book a visit or leave a message for our staff.",
    emergency: "If you have heavy bleeding, severe pain or feel unwell, call 112 right away or go to the nearest emergency department.",
    smalltalkHello: "Hello! 😊 How can I help you?",
    smalltalkThanks: "You're welcome! If you have more questions, I'm here.",
    hoursTitle: "Opening hours",
    hoursMonFri: "Monday – Friday",
    hoursTuesday: "Tuesday",
    hoursSat: "Saturday",
    hoursSun: "Sunday",
    locationTitle: "Location",
    contactTitle: "Contact",
    contactPhone: "Phone",
    contactEmail: "Email",
    teamTitle: "Our team",
    teamSummary: (d, e, n) =>
      `Our team includes ${d} ${d === 1 ? "doctor" : "doctors"}, ${e} ${e === 1 ? "embryologist" : "embryologists"} and ${n} ${n === 1 ? "nurse" : "nurses"}.`,
    teamDoctors: "Doctors",
    bookingTitle: "Booking a visit",
    bookingText: (phone) =>
      `You can book a visit through the form on our website${phone ? ` or by phone at ${phone}` : ""}. Our staff will confirm the appointment.`,
  },
  ru: {
    tagline: "Ваш гид по репродуктивному здоровью и ЭКО",
    greeting: "Здравствуйте! 👋 Добро пожаловать на наш сайт. Если у вас есть вопросы, я здесь.",
    status: "Виртуальный ассистент",
    openChat: "Открыть чат",
    closeChat: "Закрыть чат",
    closeGreeting: "Закрыть сообщение",
    notifications: "Уведомления",
    placeholder: "Напишите вопрос…",
    send: "Отправить",
    disclaimer: "Я не даю медицинских советов. Пожалуйста, не указывайте в чате данные о здоровье.",
    welcome: "Здравствуйте! Я виртуальный ассистент клиники. Спросите меня о часах работы, адресе, ценах, нашей команде или записи на приём.",
    chips: [
      { label: "Часы работы", q: "часы работы" },
      { label: "Адрес", q: "адрес" },
      { label: "Цены", q: "цены" },
      { label: "Наша команда", q: "врачи" },
      { label: "Записаться", q: "записаться на приём" },
    ],
    thinking: "Ищу ответ…",
    error: "Произошла ошибка. Попробуйте ещё раз или позвоните нам.",
    readMore: "Подробнее",
    bookVisit: "Записаться на приём",
    callUs: "Позвонить",
    showMap: "Открыть карту",
    meetTeam: "Наша команда",
    handoffButton: "Написать сотрудникам",
    handoffTitle: "Сообщение сотрудникам клиники",
    handoffIntro: "Оставьте имя и контакт — наши сотрудники свяжутся с вами.",
    handoffName: "Имя и фамилия",
    handoffContact: "Телефон или email",
    handoffMessage: "Ваш вопрос",
    handoffConsent: "Я согласен(на), что клиника использует эти данные, чтобы ответить мне.",
    handoffSend: "Отправить",
    handoffCancel: "Отмена",
    handoffThanks: "Спасибо! Сообщение отправлено сотрудникам. Мы скоро свяжемся с вами.",
    handoffInvalid: "Заполните имя, контакт и вопрос и подтвердите согласие.",
    maybeAlso: "Возможно, вас заинтересует:",
    unknown: "К сожалению, на этот вопрос у меня нет ответа. Вы можете оставить сообщение сотрудникам или позвонить нам.",
    medical: "Я не могу давать медицинские советы или толковать анализы и лечение — это может только врач. Запишитесь на приём или оставьте сообщение сотрудникам.",
    emergency: "Если у вас сильное кровотечение, сильная боль или вы плохо себя чувствуете, сразу звоните 112 или обратитесь в ближайшее отделение неотложной помощи.",
    smalltalkHello: "Здравствуйте! 😊 Чем могу помочь?",
    smalltalkThanks: "Пожалуйста! Если будут ещё вопросы, я здесь.",
    hoursTitle: "Часы работы",
    hoursMonFri: "Понедельник – пятница",
    hoursTuesday: "Вторник",
    hoursSat: "Суббота",
    hoursSun: "Воскресенье",
    locationTitle: "Адрес",
    contactTitle: "Контакты",
    contactPhone: "Телефон",
    contactEmail: "Email",
    teamTitle: "Наша команда",
    teamSummary: (d, e, n) =>
      `В нашей команде врачей: ${d}, эмбриологов: ${e}, медсестёр: ${n}.`,
    teamDoctors: "Врачи",
    bookingTitle: "Запись на приём",
    bookingText: (phone) =>
      `Записаться на приём можно через форму на сайте${phone ? ` или по телефону ${phone}` : ""}. Сотрудники подтвердят время.`,
  },
};

/** Ključne riječi ugrađenih odgovora (sva tri jezika zajedno — pacijent može pisati bilo kako). */
export const BUILTIN_KEYWORDS = {
  hours: "radno vrijeme vreme radite otvoreno zatvoreno subota nedjelja vikend sati satnica opening hours open closed weekend часы работы работаете открыто выходные суббота воскресенье",
  location: "lokacija adresa nalazite mapa budva doći stići parking location address map directions find адрес где находитесь карта",
  contact: "kontakt telefon pozvati nazvati email mejl mail javiti contact phone call email контакты телефон позвонить почта",
  team: "ljekar doktor tim ginekolog embriolog sestra osoblje specijalista team doctor doctors staff gynecologist embryologist nurse команда врач врачи гинеколог эмбриолог медсестра персонал",
  booking: "zakazati zakazivanje zakažem termin pregled konsultacija naručiti book booking appointment visit consultation записаться запись приём прием консультация",
} as const;

/** Pozdrav / zahvala — kratki ljudski odgovor bez pretrage. */
export const SMALLTALK_HELLO = ["zdravo", "cao", "ćao", "hej", "pozdrav", "dobar", "dan", "hello", "hi", "hey", "привет", "здравствуйте", "добрый"];
export const SMALLTALK_THANKS = ["hvala", "fala", "thanks", "thank", "thx", "спасибо"];

/** Riječi koje traže medicinsko mišljenje (bot ne odgovara, šalje ljekaru). Prefiksi normalizovanih riječi. */
export const MEDICAL_PREFIXES = [
  "terapij", "simptom", "dijagnoz", "tumac", "hormon", "hormone", "гормон", "hcg", "amh", "fsh", "progesteron",
  "estradiol", "spermogram", "tablet", "uzima", "lekov", "doziran", "nuspoja",
  "treatment", "symptom", "diagnos", "dosage", "medicat", "pill",
  "анализ", "симптом", "диагноз", "лечени", "лекарств", "таблетк", "дозировк",
];
/** Cijele riječi (prefiks bi hvatao i „lekar”, „dozvola”, „nalazite”…). */
export const MEDICAL_EXACT = ["nalaz", "nalaza", "nalazu", "nalazima", "lek", "leka", "lekove", "lekovi", "doza", "dozu", "doze", "dose", "доза", "дозу"];

/** Hitni simptomi — uz medicinski odgovor ide i broj hitne pomoći. */
export const EMERGENCY_PREFIXES = [
  "krvar", "hitn", "nesvest", "temperatur", "groznic", "bleed", "emergenc", "fever", "faint",
  "кровотеч", "срочн", "температур",
];
/** Cijele riječi („bol” kao prefiks bi hvatao „bolje”, „bolnica”). */
export const EMERGENCY_EXACT = ["bol", "bolove", "bolovi", "boli", "pain", "painful", "боль", "болит", "боли"];
