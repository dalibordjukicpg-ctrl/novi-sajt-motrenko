/**
 * Brzi dijagnostički test prevoda kratkih nav-labela.
 *   npm run test:nav-translate
 *
 * Šta radi:
 *  - Učita OPENAI_API_KEY iz .env
 *  - Pošalje OpenAI istom prompt-u kao i admin (anti-transliteracija)
 *  - Prikaže šta vraća za labele "O nama", "Blog", "Kontakt", "Usluge", "Pretraga"
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

function readOpenAIKey() {
  let k = (process.env.OPENAI_API_KEY || "").trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

async function callOpenAI(texts, target) {
  const key = readOpenAIKey();
  if (!key || !key.startsWith("sk-")) {
    throw new Error(
      "OPENAI_API_KEY nije podešen u .env (mora počinjati sa sk-).",
    );
  }
  const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const targetLang = target === "en" ? "English" : "Russian";
  const antiNote =
    target === "ru"
      ? ' IMPORTANT: TRANSLATE the meaning into proper Russian — do NOT transliterate Latin Serbian into Cyrillic. For example "O nama" must become "О нас", "Usluge" → "Услуги", "Kontakt" → "Контакты", "Pretraga" → "Поиск". Always produce real Russian words a native speaker would use, not Serbian written in Cyrillic.'
      : " IMPORTANT: TRANSLATE the meaning into proper, idiomatic English — do not just write the Serbian word in Latin letters.";
  const casingNote =
    " Preserve the original visual casing: if the input is ALL CAPS or Title Case, return the translation in the same style.";

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
            `You are a professional translator. Translate each string from Montenegrin/Serbian to ${targetLang}.${antiNote}${casingNote} ` +
            `Return JSON only: {"translations":["..."]} with exactly ${texts.length} strings in the same order as input.`,
        },
        { role: "user", content: JSON.stringify({ texts }) },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = (data.choices?.[0]?.message?.content || "").trim();
  if (!content) throw new Error("Prazan odgovor iz OpenAI.");
  const parsed = JSON.parse(content);
  return parsed.translations || [];
}

async function main() {
  const labels = ["O nama", "Blog", "Kontakt", "Usluge", "Pretraga", "Naša priča", "Naš tim"];

  console.log(`Model: ${process.env.OPENAI_MODEL || "gpt-4o-mini"}`);
  console.log("─".repeat(60));

  for (const target of ["en", "ru"]) {
    const out = await callOpenAI(labels, target);
    console.log(`\n→ ${target.toUpperCase()}:`);
    labels.forEach((src, i) => {
      const translated = out[i] || "(prazno)";
      const isCyr = /[\u0400-\u04FF]/.test(translated);
      const sameAsMe = translated.toLowerCase() === src.toLowerCase();
      const flag =
        sameAsMe
          ? "  ⚠ NEPROMIJENJENO"
          : target === "ru" && !isCyr
            ? "  ⚠ NIJE ĆIRILICA"
            : "";
      console.log(`  ${src.padEnd(16)} → ${translated}${flag}`);
    });
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
