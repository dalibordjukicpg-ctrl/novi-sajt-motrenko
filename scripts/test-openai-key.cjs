/**
 * Provjera OPENAI_API_KEY iz .env (ne ispisuje ključ).
 * npm run test:openai
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

function readKey() {
  let k = (process.env.OPENAI_API_KEY ?? "").trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

const key = readKey();
if (!key) {
  console.error("OPENAI_API_KEY nije u .env");
  process.exit(1);
}
if (!key.startsWith("sk-")) {
  console.error("Ključ mora počinjati sa sk-");
  process.exit(1);
}

console.log("Testiram ključ (dužina:", key.length, "znakova)...");

const model = (process.env.OPENAI_MODEL ?? "gpt-4o-mini").trim();

async function run() {
  const modelsRes = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!modelsRes.ok) {
    const body = await modelsRes.text();
    console.error("Greška (models)", modelsRes.status + ":", body.slice(0, 400));
    if (modelsRes.status === 401) print401Help();
    process.exit(1);
  }
  console.log("OK — ključ važi (models).");

  const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: 'Reply JSON only: {"translations":["Hello"]}',
        },
      ],
    }),
  });
  if (!chatRes.ok) {
    const body = await chatRes.text();
    console.error("Greška (chat)", chatRes.status + ":", body.slice(0, 400));
    if (chatRes.status === 401) print401Help();
    process.exit(1);
  }
  console.log("OK — chat API radi (model:", model + "). Admin prevod bi trebao raditi.");
  process.exit(0);
}

function print401Help() {
  console.error(
    "\n→ Kreiraj NOVI ključ: https://platform.openai.com/api-keys\n→ Revoke stari\n→ Zalijepi u .env: OPENAI_API_KEY=sk-proj-...\n→ npm run dev",
  );
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
