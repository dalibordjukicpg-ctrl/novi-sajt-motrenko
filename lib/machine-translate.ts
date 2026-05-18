import type { Locale } from "@/lib/i18n";

export type MachineTranslateTarget = Exclude<Locale, "me">;

export type TranslateProvider =
  | "openai"
  | "azure"
  | "deepl"
  | "google"
  | "libre"
  | "mymemory";

const DEEPL_TARGET: Record<MachineTranslateTarget, string> = {
  en: "EN",
  ru: "RU",
};

const GOOGLE_TARGET: Record<MachineTranslateTarget, string> = {
  en: "en",
  ru: "ru",
};

const LIBRE_TARGET: Record<MachineTranslateTarget, string> = {
  en: "en",
  ru: "ru",
};

/** Ukloni navodnike i razmake oko ključa iz .env. */
function readOpenAIKey(): string {
  let k = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

function hasOpenAIKey(): boolean {
  const k = readOpenAIKey();
  return k.length > 20 && /^sk-/.test(k);
}

function hasAzureKey(): boolean {
  return Boolean(
    process.env.AZURE_TRANSLATOR_KEY?.trim() &&
      process.env.AZURE_TRANSLATOR_REGION?.trim(),
  );
}

function hasDeepLKey(): boolean {
  return Boolean(process.env.DEEPL_API_KEY?.trim());
}

function hasGoogleKey(): boolean {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY?.trim());
}

function hasLibreConfig(): boolean {
  return Boolean(
    process.env.LIBRETRANSLATE_API_KEY?.trim() ||
      process.env.LIBRETRANSLATE_URL?.trim(),
  );
}

/** Koji provajder koristiti. Prioritet: eksplicitan .env → automatski detekcija. */
export function getTranslateProvider(): TranslateProvider | null {
  const pref = process.env.TRANSLATE_PROVIDER?.trim().toLowerCase();

  if (pref === "openai") return hasOpenAIKey() ? "openai" : null;
  if (pref === "azure") return hasAzureKey() ? "azure" : null;
  if (pref === "deepl") return hasDeepLKey() ? "deepl" : null;
  if (pref === "google") return hasGoogleKey() ? "google" : null;
  if (pref === "libre") return hasLibreConfig() ? "libre" : null;
  if (pref === "mymemory") return "mymemory";

  // Automatska detekcija po ključevima
  if (hasOpenAIKey()) return "openai";
  if (hasAzureKey()) return "azure";
  if (hasDeepLKey()) return "deepl";
  if (hasGoogleKey()) return "google";
  if (hasLibreConfig()) return "libre";

  // Bez ključeva: MyMemory samo ako nije eksplicitno isključen runtime prevod
  if (process.env.AUTO_TRANSLATE_ON_VIEW !== "0") return "mymemory";

  return null;
}

/** Jasna poruka ako provajder nije spreman (npr. Azure bez ključa). */
export function getTranslateConfigError(): string | null {
  const pref = process.env.TRANSLATE_PROVIDER?.trim().toLowerCase();
  if (pref === "openai" && !hasOpenAIKey()) {
    return "U .env dodaj OPENAI_API_KEY (platform.openai.com → API keys).";
  }
  if (pref === "azure" && !hasAzureKey()) {
    return "U .env dodaj AZURE_TRANSLATOR_KEY i AZURE_TRANSLATOR_REGION (portal.azure.com → Translator → Keys).";
  }
  if (pref === "deepl" && !hasDeepLKey()) {
    return "U .env dodaj DEEPL_API_KEY.";
  }
  if (pref === "google" && !hasGoogleKey()) {
    return "U .env dodaj GOOGLE_TRANSLATE_API_KEY.";
  }
  if (getTranslateProvider() == null) {
    return "Automatski prevod nije podešen. U .env: TRANSLATE_PROVIDER=openai i OPENAI_API_KEY, pa restartuj dev server.";
  }
  return null;
}

/** Da li je podešen bilo koji API za automatski prevod. */
export function isMachineTranslateConfigured(): boolean {
  return getTranslateProvider() != null;
}

// ── Azure AI Translator ────────────────────────────────────────────────────

type AzureTranslateItem = { translations: { text: string; to: string }[] };

async function azureTranslateTexts(
  texts: string[],
  target: MachineTranslateTarget,
  options?: { html?: boolean },
): Promise<string[]> {
  const key = process.env.AZURE_TRANSLATOR_KEY?.trim();
  const region = process.env.AZURE_TRANSLATOR_REGION?.trim();
  if (!key || !region) {
    throw new Error(
      "AZURE_TRANSLATOR_KEY ili AZURE_TRANSLATOR_REGION nije podešen u .env.",
    );
  }

  const base = (
    process.env.AZURE_TRANSLATOR_ENDPOINT?.trim() ||
    "https://api.cognitive.microsofttranslator.com"
  ).replace(/\/$/, "");

  const url = new URL(`${base}/translate`);
  url.searchParams.set("api-version", "3.0");
  url.searchParams.set("from", "sr");
  url.searchParams.set("to", target === "en" ? "en" : "ru");
  if (options?.html) url.searchParams.set("textType", "html");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
    },
    body: JSON.stringify(texts.map((t) => ({ Text: t }))),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Azure Translator greška (${res.status}): ${errText.slice(0, 300) || res.statusText}`,
    );
  }

  const data = (await res.json()) as AzureTranslateItem[];
  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error("Azure Translator je vratio neočekivan odgovor.");
  }

  return data.map((item, i) => item.translations[0]?.text ?? texts[i] ?? "");
}

// ── OpenAI ───────────────────────────────────────────────────────────────

const OPENAI_BATCH_SIZE = 12;

type OpenAIChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

async function openaiTranslateTexts(
  texts: string[],
  target: MachineTranslateTarget,
  options?: { html?: boolean },
): Promise<string[]> {
  const key = readOpenAIKey();
  if (!key) throw new Error("OPENAI_API_KEY nije podešen u .env.");
  if (!key.startsWith("sk-")) {
    throw new Error(
      "OPENAI_API_KEY mora počinjati sa sk-. Kopiraj cijeli ključ sa platform.openai.com/api-keys.",
    );
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const targetLang = target === "en" ? "English" : "Russian";
  const htmlNote = options?.html
    ? " Preserve all HTML tags and attributes exactly; translate only visible text between tags."
    : "";
  const antiTransliterationNote =
    target === "ru"
      ? " IMPORTANT: TRANSLATE the meaning into proper Russian — do NOT transliterate Latin Serbian into Cyrillic. " +
        'For example "O nama" must become "О нас", "Usluge" → "Услуги", "Kontakt" → "Контакты", "Pretraga" → "Поиск". ' +
        "Always produce real Russian words a native speaker would use, not Serbian written in Cyrillic."
      : " IMPORTANT: TRANSLATE the meaning into proper, idiomatic English — do not just write the Serbian word in Latin letters.";
  const casingNote =
    " Preserve the original visual casing: if the input is ALL CAPS or Title Case, return the translation in the same style.";

  const out: string[] = [];

  for (let i = 0; i < texts.length; i += OPENAI_BATCH_SIZE) {
    const chunk = texts.slice(i, i + OPENAI_BATCH_SIZE);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You are a professional translator. Translate each string from Montenegrin/Serbian to ${targetLang}.${htmlNote}${antiTransliterationNote}${casingNote} ` +
              `Return JSON only: {"translations":["..."]} with exactly ${chunk.length} strings in the same order as input.`,
          },
          {
            role: "user",
            content: JSON.stringify({ texts: chunk }),
          },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new Error(
          "OpenAI API ključ nije ispravan (401). Na platform.openai.com/api-keys kreiraj NOVI ključ, zamijeni OPENAI_API_KEY u .env (bez navodnika), restartuj npm run dev. Stari ključ iz chata obriši/revoke.",
        );
      }
      throw new Error(
        `OpenAI greška (${res.status}): ${errText.slice(0, 300) || res.statusText}`,
      );
    }

    const data = (await res.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error(data.error?.message ?? "OpenAI nije vratio prevod.");
    }

    let parsed: { translations?: unknown[] };
    try {
      parsed = JSON.parse(content) as { translations?: unknown[] };
    } catch {
      throw new Error("OpenAI je vratio neispravan JSON.");
    }

    const tr = parsed.translations;
    if (!Array.isArray(tr) || tr.length !== chunk.length) {
      throw new Error("OpenAI je vratio pogrešan broj prevoda.");
    }
    out.push(...tr.map((t) => String(t ?? "")));
  }

  return out;
}

// ── DeepL ─────────────────────────────────────────────────────────────────

function deeplEndpoint(): string {
  const custom = process.env.DEEPL_API_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");
  const pro = process.env.DEEPL_API_KEY?.startsWith("fx:");
  return pro
    ? "https://api.deepl.com/v2/translate"
    : "https://api-free.deepl.com/v2/translate";
}

type DeeplResponse = {
  translations?: { text: string }[];
};

type GoogleTranslateResponse = {
  data?: { translations?: { translatedText: string }[] };
  error?: { message?: string };
};

type LibreResponse = {
  translatedText?: string;
  error?: string;
};

type MyMemoryResponse = {
  responseStatus?: number;
  responseData?: { translatedText?: string };
  responseDetails?: string;
};

async function deeplTranslateTexts(
  texts: string[],
  target: MachineTranslateTarget,
  options?: { html?: boolean },
): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) throw new Error("DEEPL_API_KEY nije podešen.");

  const body = new URLSearchParams();
  body.set("auth_key", key);
  for (const t of texts) body.append("text", t);
  body.set("target_lang", DEEPL_TARGET[target]);
  body.set("source_lang", "SR");
  if (options?.html) body.set("tag_handling", "html");

  const res = await fetch(`${deeplEndpoint()}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `DeepL greška (${res.status}): ${errText.slice(0, 200) || res.statusText}`,
    );
  }

  const data = (await res.json()) as DeeplResponse;
  const translated = data.translations?.map((x) => x.text) ?? [];
  if (translated.length !== texts.length) {
    throw new Error("DeepL je vratio neočekivan broj prevoda.");
  }
  return translated;
}

async function googleTranslateTexts(
  texts: string[],
  target: MachineTranslateTarget,
  options?: { html?: boolean },
): Promise<string[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!key) throw new Error("GOOGLE_TRANSLATE_API_KEY nije podešen.");

  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: texts,
      target: GOOGLE_TARGET[target],
      source: "sr",
      format: options?.html ? "html" : "text",
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as GoogleTranslateResponse;
  if (!res.ok) {
    const msg = data.error?.message ?? res.statusText;
    throw new Error(`Google Translate greška (${res.status}): ${msg}`);
  }

  const translated =
    data.data?.translations?.map((x) => x.translatedText) ?? [];
  if (translated.length !== texts.length) {
    throw new Error("Google Translate je vratio neočekivan broj prevoda.");
  }
  return translated;
}

async function libreTranslateOne(
  text: string,
  target: MachineTranslateTarget,
  options?: { html?: boolean },
): Promise<string> {
  const base =
    process.env.LIBRETRANSLATE_URL?.trim() || "https://libretranslate.com";
  const url = `${base.replace(/\/$/, "")}/translate`;

  const body: Record<string, string> = {
    q: text,
    source: "sr",
    target: LIBRE_TARGET[target],
    format: options?.html ? "html" : "text",
  };
  const apiKey = process.env.LIBRETRANSLATE_API_KEY?.trim();
  if (apiKey) body.api_key = apiKey;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json()) as LibreResponse;
  if (!res.ok) {
    throw new Error(
      `LibreTranslate greška (${res.status}): ${data.error ?? res.statusText}`,
    );
  }
  return data.translatedText ?? text;
}

async function libreTranslateTexts(
  texts: string[],
  target: MachineTranslateTarget,
  options?: { html?: boolean },
): Promise<string[]> {
  return Promise.all(
    texts.map((t) =>
      withTimeout(libreTranslateOne(t, target, options), TRANSLATE_TIMEOUT_MS, t),
    ),
  );
}

const TRANSLATE_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function mymemoryTranslateOne(
  text: string,
  target: MachineTranslateTarget,
): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 500));
  url.searchParams.set("langpair", `sr|${LIBRE_TARGET[target]}`);
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) url.searchParams.set("de", email);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as MyMemoryResponse;
  if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
    const detail = data.responseDetails ?? "nepoznata greška";
    const quota =
      /quota|limit|exceeded|MYMEMORY WARNING/i.test(detail) ||
      data.responseStatus === 429;
    if (quota) {
      throw new Error(
        "MyMemory dnevni limit je potrošen. U .env postavi Azure (AZURE_TRANSLATOR_KEY + REGION) ili sačekaj sutra. Preporuka: AUTO_TRANSLATE_ON_VIEW=0 dok ne podesiš Azure.",
      );
    }
    throw new Error(`MyMemory greška: ${detail}`);
  }
  return data.responseData.translatedText;
}

async function mymemoryTranslateTexts(
  texts: string[],
  target: MachineTranslateTarget,
): Promise<string[]> {
  // Paralelni pozivi sa timeoutom — ako ne stigne, vraća original
  const results = await Promise.all(
    texts.map((t) =>
      withTimeout(mymemoryTranslateOne(t, target), TRANSLATE_TIMEOUT_MS, t),
    ),
  );
  return results;
}

/**
 * Jedan ili više segmenata; prazan string ostaje prazan (API se ne zove).
 */
export async function machineTranslateTexts(
  texts: string[],
  target: MachineTranslateTarget,
  options?: { html?: boolean },
): Promise<string[]> {
  const provider = getTranslateProvider();
  if (!provider) {
    throw new Error(
      getTranslateConfigError() ??
        "Automatski prevod nije podešen. U .env postavi Azure ključeve ili TRANSLATE_PROVIDER=mymemory.",
    );
  }

  const out = [...texts];
  const indices: number[] = [];
  const payload: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i] ?? "";
    if (t.trim().length === 0) continue;
    indices.push(i);
    payload.push(t);
  }

  if (payload.length === 0) return out;

  let translated: string[];
  switch (provider) {
    case "openai":
      translated = await openaiTranslateTexts(payload, target, options);
      break;
    case "azure":
      translated = await azureTranslateTexts(payload, target, options);
      break;
    case "google":
      translated = await googleTranslateTexts(payload, target, options);
      break;
    case "libre":
      translated = await libreTranslateTexts(payload, target, options);
      break;
    case "mymemory":
      translated = await mymemoryTranslateTexts(payload, target);
      break;
    default:
      translated = await deeplTranslateTexts(payload, target, options);
  }

  for (let j = 0; j < indices.length; j++) {
    out[indices[j]!] = translated[j] ?? "";
  }
  return out;
}

export async function machineTranslatePlain(
  text: string,
  target: MachineTranslateTarget,
): Promise<string> {
  const [out] = await machineTranslateTexts([text], target);
  return out ?? "";
}

/** Dijeli dugačak HTML da OpenAI ne skrati odgovor. */
function splitHtmlForTranslation(html: string, maxChunk = 3500): string[] {
  const source = html.trim();
  if (source.length <= maxChunk) return [source];

  const parts: string[] = [];
  let buffer = "";
  const segments = source.split(/(?<=<\/(?:p|h[1-6]|li|div|blockquote|td|th|tr|section|article)>)/i);

  for (const seg of segments) {
    if (!seg) continue;
    if ((buffer + seg).length > maxChunk && buffer.trim()) {
      parts.push(buffer);
      buffer = seg;
    } else {
      buffer += seg;
    }
  }
  if (buffer.trim()) parts.push(buffer);

  return parts.length > 0 ? parts : [source];
}

export async function machineTranslateHtml(
  html: string,
  target: MachineTranslateTarget,
): Promise<string> {
  const source = html.trim();
  if (!source) return html;

  const chunks = splitHtmlForTranslation(source);
  if (chunks.length === 1) {
    const [out] = await machineTranslateTexts([source], target, { html: true });
    return out ?? source;
  }

  const translated: string[] = [];
  for (const chunk of chunks) {
    const [out] = await machineTranslateTexts([chunk], target, { html: true });
    translated.push(out ?? chunk);
  }
  return translated.join("");
}

/** URL, sidro, putanja — ne prevoditi. */
export function isNonTranslatableStringValue(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(v)) return true;
  if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) return true;
  return false;
}
