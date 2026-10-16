/** Kategorije unosa u bazi znanja (samo za raspored u adminu; bot pretražuje sve). */
export const CHATBOT_CATEGORIES = [
  { key: "opste", label: "Opšte informacije" },
  { key: "cijene", label: "Cijene i plaćanje" },
  { key: "postupci", label: "Postupci i tretmani" },
  { key: "uspjesnost", label: "Uspješnost i rezultati" },
  { key: "tim", label: "Tim i ljekari" },
  { key: "lokacija", label: "Lokacija i dolazak" },
  { key: "ostalo", label: "Ostalo" },
] as const;

export type ChatbotCategoryKey = (typeof CHATBOT_CATEGORIES)[number]["key"];

export function isChatbotCategory(v: string): v is ChatbotCategoryKey {
  return CHATBOT_CATEGORIES.some((c) => c.key === v);
}

export function chatbotCategoryLabel(key: string): string {
  return CHATBOT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/**
 * Predlošci koje admin dobija jednim klikom: pitanje i ključne riječi su upisani, odgovor upisuje klinika.
 * Kreiraju se kao neobjavljeni — bot ih ne koristi dok neko ne upiše odgovor i ne objavi.
 */
export const CHATBOT_STARTER_ENTRIES: {
  category: ChatbotCategoryKey;
  question: string;
  keywords: string;
}[] = [
  { category: "cijene", question: "Koliko košta IVF postupak?", keywords: "cijena ivf vantjelesna oplodnja košta cjenovnik" },
  { category: "cijene", question: "Koliko košta prvi pregled / konsultacija?", keywords: "cijena pregled konsultacija prvi pregled ginekolog cjenovnik" },
  { category: "cijene", question: "Kako se plaća? (kartice, rate, fond)", keywords: "plaćanje kartica rate gotovina fond zdravstva fzo" },
  { category: "uspjesnost", question: "Kolika je uspješnost IVF-a u klinici?", keywords: "uspješnost procenat rezultati trudnoća ivf statistika" },
  { category: "uspjesnost", question: "Koliko je beba rođeno uz pomoć klinike?", keywords: "beba rođeno broj trudnoća rezultati" },
  { category: "postupci", question: "Koliko traje IVF postupak?", keywords: "trajanje ivf koliko traje faze postupka" },
  { category: "postupci", question: "Šta da ponesem na prvi pregled?", keywords: "prvi pregled ponijeti nalazi dokumentacija priprema" },
  { category: "opste", question: "Da li klinika radi sa Fondom zdravstvenog osiguranja?", keywords: "fond fzo osiguranje besplatno uput" },
  { category: "opste", question: "Na kojim jezicima možemo komunicirati?", keywords: "jezik engleski ruski language english" },
  { category: "lokacija", question: "Ima li parkinga kod klinike?", keywords: "parking auto parkiranje dolazak" },
];
