import {
  CHATBOT_COPY,
  EMERGENCY_EXACT,
  EMERGENCY_PREFIXES,
  MEDICAL_EXACT,
  MEDICAL_PREFIXES,
  SMALLTALK_HELLO,
  SMALLTALK_THANKS,
} from "@/lib/chatbot/copy";
import { getChatbotDocs, type BotDoc, type BotLink } from "@/lib/chatbot/knowledge-index";
import { fieldMatch, normalizeWord, queryTerms, tokenize } from "@/lib/chatbot/text";
import type { Locale } from "@/lib/i18n";

/**
 * Odgovor bez AI modela: pitanje se poredi sa bazom znanja, ugrađenim podacima (radno vrijeme,
 * lokacija, tim…) i tekstovima sajta. Bot nikad ne sastavlja nov tekst — vraća ono što piše u bazi.
 * Kad se kasnije doda model, on dobija ove pogotke kao izvor (`hits`) i preformuliše odgovor.
 */

export type BotReplyKind = "answer" | "unknown" | "medical" | "smalltalk";

export type BotReply = {
  kind: BotReplyKind;
  title: string | null;
  text: string;
  links: BotLink[];
  suggestions: string[];
  offerHandoff: boolean;
  /** Za statistiku — koji izvor je odgovorio (bez teksta pitanja). */
  statKey: string;
};

type Scored = { doc: BotDoc; score: number; matched: string[] };

const MIN_SCORE = 2.6;
const EXCERPT_CHARS = 420;

const normList = (list: readonly string[]) => list.map(normalizeWord);
const MED_PREFIX = normList(MEDICAL_PREFIXES);
const MED_EXACT = new Set(normList(MEDICAL_EXACT));
const EMERG_PREFIX = normList(EMERGENCY_PREFIXES);
const EMERG_EXACT = new Set(normList(EMERGENCY_EXACT));
const HELLO = new Set(normList(SMALLTALK_HELLO));
const THANKS = new Set(normList(SMALLTALK_THANKS));

function scoreDoc(doc: BotDoc, terms: string[][]): Scored {
  let sum = 0;
  let hits = 0;
  const matched: string[] = [];
  for (const alternatives of terms) {
    let best = 0;
    for (const term of alternatives) {
      best = Math.max(
        best,
        fieldMatch(doc.keywords, term) * 4,
        fieldMatch(doc.titleField, term) * 3,
        fieldMatch(doc.body, term),
      );
    }
    if (best > 0) {
      sum += best;
      hits += 1;
      matched.push(alternatives[0]!);
    }
  }
  const coverage = terms.length ? hits / terms.length : 0;
  // Dugi tekstovi sajta pominju svašta: uz više riječi u pitanju moraju pokriti većinu njih.
  if ((doc.kind === "page" || doc.kind === "post") && terms.length >= 2 && coverage < 0.6) {
    return { doc, score: 0, matched };
  }
  return { doc, score: sum * (0.4 + 0.6 * coverage) * doc.weight, matched };
}

/** Rečenice iz odjeljka stranice koje sadrže tražene riječi, do ~420 znakova. */
function excerpt(text: string, matched: string[]): string {
  if (text.length <= EXCERPT_CHARS) return text;
  const sentences = text.split(/(?<=[.!?])\s+|\n/).filter((s) => s.trim());
  const ranked = sentences
    .map((s, i) => {
      const tokens = new Set(tokenize(s));
      const hits = matched.filter((m) => [...tokens].some((t) => t.startsWith(m.slice(0, 4)))).length;
      return { s: s.trim(), i, hits };
    })
    .sort((a, b) => b.hits - a.hits || a.i - b.i);
  const picked: typeof ranked = [];
  let len = 0;
  for (const r of ranked) {
    if (len + r.s.length > EXCERPT_CHARS && picked.length > 0) break;
    picked.push(r);
    len += r.s.length + 1;
  }
  const joined = picked
    .sort((a, b) => a.i - b.i)
    .map((r) => r.s)
    .join(" ");
  return joined.length > EXCERPT_CHARS + 80 ? `${joined.slice(0, EXCERPT_CHARS).trimEnd()}…` : joined;
}

function detectMedical(words: string[]): { medical: boolean; emergency: boolean } {
  const emergency = words.some((w) => EMERG_EXACT.has(w) || EMERG_PREFIX.some((p) => w.startsWith(p)));
  const medical =
    emergency || words.some((w) => MED_EXACT.has(w) || MED_PREFIX.some((p) => w.startsWith(p)));
  return { medical, emergency };
}

export async function answerQuestion(locale: Locale, question: string): Promise<BotReply> {
  const copy = CHATBOT_COPY[locale];
  const words = tokenize(question);
  const terms = queryTerms(question);
  const { medical, emergency } = detectMedical(words);

  // Samo pozdrav ili zahvala, bez pravog pitanja („zdravo”, „hvala puno”).
  const contentTerms = terms.filter((t) => !HELLO.has(t[0]!) && !THANKS.has(t[0]!));
  if (!medical && words.length <= 4 && contentTerms.length === 0) {
    if (words.some((w) => THANKS.has(w))) return smalltalk(copy.smalltalkThanks, "smalltalk:thanks");
    if (words.some((w) => HELLO.has(w))) return smalltalk(copy.smalltalkHello, "smalltalk:hello");
  }

  const docs = await getChatbotDocs(locale);
  const ranked = terms.length
    ? docs
        .map((d) => scoreDoc(d, terms))
        .filter((s) => s.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
    : [];

  const top = ranked[0];
  const medicalNote = emergency ? `${copy.emergency}\n\n${copy.medical}` : copy.medical;

  if (medical) {
    // Činjenice iz baze (npr. cijena analize) i dalje smiju, ali uz upozorenje i ljekara.
    const factual = top && (top.doc.kind === "entry" || top.doc.kind === "builtin") ? top : null;
    return {
      kind: "medical",
      title: factual?.doc.title ?? null,
      text: factual ? `${factual.doc.text}\n\n${medicalNote}` : medicalNote,
      links: [
        ...(factual?.doc.links ?? []),
        ...bookingLinks(docs).filter((l) => !factual?.doc.links.some((x) => x.href === l.href)),
      ],
      suggestions: [],
      offerHandoff: true,
      statKey: factual ? factual.doc.key : "medical",
    };
  }

  if (!top) {
    return {
      kind: "unknown",
      title: null,
      text: copy.unknown,
      links: bookingLinks(docs).filter((l) => l.href.startsWith("tel:")),
      suggestions: docs.filter((d) => d.kind === "builtin").map((d) => d.suggestion!).slice(0, 3),
      offerHandoff: true,
      statKey: "unknown",
    };
  }

  const text = top.doc.kind === "page" || top.doc.kind === "post" ? excerpt(top.doc.text, top.matched) : top.doc.text;
  const suggestions = ranked
    .slice(1)
    .filter((s) => s.doc.suggestion && s.doc.key !== top.doc.key && s.score >= top.score * 0.5)
    .map((s) => s.doc.suggestion!)
    .filter((v, i, all) => all.indexOf(v) === i)
    .slice(0, 2);

  return {
    kind: "answer",
    title: top.doc.title,
    text,
    links: top.doc.links,
    suggestions,
    offerHandoff: top.doc.key === "builtin:booking",
    statKey: top.doc.key,
  };
}

function smalltalk(text: string, statKey: string): BotReply {
  return { kind: "smalltalk", title: null, text, links: [], suggestions: [], offerHandoff: false, statKey };
}

function bookingLinks(docs: BotDoc[]): BotLink[] {
  return docs.find((d) => d.key === "builtin:booking")?.links ?? [];
}
