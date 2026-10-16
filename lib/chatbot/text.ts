/**
 * Normalizacija i poređenje riječi za pretragu bota (bez AI modela).
 * Isto pravilo se primjenjuje na pitanje i na tekstove iz baze, pa ijekavica/ekavica,
 * dijakritici i padeži („ljekar”, „lekara”, „ljekari”) završe na istom korijenu.
 */

export function normalizeWord(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/ё/g, "е")
    .replace(/ije/g, "e")
    .replace(/je/g, "e");
}

const STOP_RAW = [
  // ME / SR
  "a", "i", "u", "o", "na", "za", "se", "je", "su", "da", "li", "mi", "me", "vi", "vam", "vas",
  "sam", "smo", "ste", "biti", "bi", "ima", "imate", "imam", "ja", "ti", "te", "to", "taj", "ta",
  "ovo", "ono", "kod", "od", "do", "sa", "iz", "po", "pri", "ali", "ili", "pa", "jer", "kako",
  "sta", "šta", "što", "koji", "koja", "koje", "kojih", "kome", "moze", "može", "mogu", "molim",
  "trebam", "treba", "zelim", "želim", "hocu", "hoću", "bih", "dali", "kad", "kada", "gdje", "gde",
  "koliko", "ne", "nije", "vaš", "vas", "vasi", "vaša", "vaše", "vasem", "vašem", "nas", "naš",
  "mene", "meni", "nam", "ce", "će", "ćete", "cete", "neki", "neka", "neko", "ovdje", "tu",
  "puno", "mnogo", "lijepo", "veliko", "baš", "malo", "još",
  // EN
  "the", "a", "an", "is", "are", "do", "does", "you", "your", "i", "my", "me", "we", "of", "to",
  "in", "on", "for", "and", "or", "what", "how", "can", "could", "would", "please", "there",
  "it", "be", "have", "has", "with", "at", "about", "much", "many", "where", "when", "which",
  "so", "very", "lot",
  // RU
  "и", "в", "во", "на", "с", "со", "по", "к", "у", "о", "об", "а", "но", "или", "не", "ли", "же",
  "как", "что", "где", "когда", "сколько", "вы", "вас", "ваш", "ваша", "я", "мне", "мы", "это",
  "есть", "можно", "пожалуйста", "у", "для", "от", "до", "какой", "какая", "какие",
  "очень", "большое",
];

export const STOP_WORDS = new Set(STOP_RAW.map(normalizeWord));

/** Riječi iz pitanja koje znače isto što i riječi u bazi znanja. */
const SYNONYM_RAW: Record<string, string[]> = {
  cjenovnik: ["cijena"],
  cenovnik: ["cijena"],
  kosta: ["cijena"],
  kostati: ["cijena"],
  kosti: ["cijena"],
  placa: ["cijena"],
  placanje: ["cijena", "placanje"],
  price: ["cijena", "price"],
  prices: ["cijena", "price"],
  cost: ["cijena", "price"],
  costs: ["cijena", "price"],
  fee: ["cijena", "price"],
  цена: ["cijena", "цена"],
  стоимость: ["cijena", "цена"],
  стоит: ["cijena", "цена"],
  doktor: ["ljekar", "doktor"],
  doktori: ["ljekar", "doktor"],
  doktora: ["ljekar", "doktor"],
  doctor: ["ljekar", "doctor"],
  doctors: ["ljekar", "doctor"],
  physician: ["ljekar", "doctor"],
  врач: ["ljekar", "врач"],
  врачи: ["ljekar", "врач"],
  доктор: ["ljekar", "врач"],
  uspjeh: ["uspjesnost"],
  uspeh: ["uspjesnost"],
  procenat: ["uspjesnost", "procenat"],
  stopa: ["uspjesnost"],
  success: ["uspjesnost", "success"],
  rate: ["uspjesnost", "rate"],
  успех: ["uspjesnost", "успех"],
  успешность: ["uspjesnost", "успех"],
  adresa: ["lokacija", "adresa"],
  address: ["lokacija", "address"],
  location: ["lokacija", "location"],
  адрес: ["lokacija", "адрес"],
};

const SYNONYMS = new Map<string, string[]>(
  Object.entries(SYNONYM_RAW).map(([k, v]) => [normalizeWord(k), v.map(normalizeWord)]),
);

export function tokenize(text: string): string[] {
  return normalizeWord(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2 || /^\p{N}+$/u.test(t));
}

/** Riječi pitanja bez veznika; svaka sa alternativama (sinonimi). */
export function queryTerms(question: string): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const t of tokenize(question)) {
    if (STOP_WORDS.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push([t, ...(SYNONYMS.get(t) ?? [])]);
  }
  return out;
}

/** Skup riječi jednog polja + indeks po prva 4 slova za brzo poređenje korijena. */
export type TokenField = { exact: Set<string>; byPrefix: Map<string, string[]> };

export function buildField(text: string): TokenField {
  const exact = new Set(tokenize(text).filter((t) => !STOP_WORDS.has(t)));
  const byPrefix = new Map<string, string[]>();
  for (const t of exact) {
    if (t.length < 4) continue;
    const key = t.slice(0, 4);
    const list = byPrefix.get(key);
    if (list) list.push(t);
    else byPrefix.set(key, [t]);
  }
  return { exact, byPrefix };
}

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

/** 1 = ista riječ, 0.8 = isti korijen (padež, množina), 0 = nema. */
export function fieldMatch(field: TokenField, term: string): number {
  if (field.exact.has(term)) return 1;
  if (term.length < 4) return 0;
  const candidates = field.byPrefix.get(term.slice(0, 4));
  if (!candidates) return 0;
  for (const c of candidates) {
    const shorter = Math.min(c.length, term.length);
    if (commonPrefix(c, term) >= Math.max(4, shorter - 2)) return 0.8;
  }
  return 0;
}

/** HTML iz CMS-a → čist tekst (bez tagova, WP shortcode-ova i entiteta). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]{1,200}\]/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
