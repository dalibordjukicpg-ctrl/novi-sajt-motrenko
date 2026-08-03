#!/usr/bin/env node
/**
 * Šalje lokalne public/uploads fajlove na produkciju (ako tamo fale / 404).
 *
 *   node --env-file=.env scripts/push-uploads-to-prod.mjs
 *   node --env-file=.env scripts/push-uploads-to-prod.mjs a1a13db1-41ad-4de3-83cb-2e59cc6bf6f5.jpg
 */
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { prodConfig } from "./lib/content-sync.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env"), override: true });

const LOCAL_UPLOADS = join(ROOT, "public", "uploads");

async function missingOnProd(relUrl) {
  try {
    const r = await fetch(`https://humanreproduction.com${relUrl}`, {
      method: "HEAD",
    });
    return r.status === 404;
  } catch {
    return true;
  }
}

async function main() {
  const { url, secret } = prodConfig();
  if (!process.env.CONTENT_SYNC_SECRET?.trim()) {
    console.error("Nedostaje CONTENT_SYNC_SECRET u .env");
    process.exit(1);
  }

  const only = process.argv.slice(2).map((s) => s.replace(/^.*[\\/]/, ""));
  if (!existsSync(LOCAL_UPLOADS)) {
    console.error("Nema public/uploads");
    process.exit(1);
  }

  let names = readdirSync(LOCAL_UPLOADS).filter((n) => n !== ".gitkeep");
  if (only.length) {
    names = names.filter((n) => only.includes(n));
  }

  const toSend = [];
  for (const name of names) {
    const abs = join(LOCAL_UPLOADS, name);
    if (!statSync(abs).isFile()) continue;
    const storageKey = `uploads/${name}`;
    const rel = `/${storageKey}`;
    const missing = await missingOnProd(rel);
    if (!missing) {
      console.log("OK (već na produ):", name);
      continue;
    }
    const buf = readFileSync(abs);
    if (buf.length > 20 * 1024 * 1024) {
      console.warn("preskačem prevelik:", name);
      continue;
    }
    toSend.push({
      storageKey,
      dataBase64: buf.toString("base64"),
    });
    console.log("za slanje:", name, `(${Math.round(buf.length / 1024)} KB)`);
  }

  if (!toSend.length) {
    console.log("Nema fajlova za slanje.");
    return;
  }

  // šalji u batch-evima (base64 povećava payload)
  const batchSize = 5;
  for (let i = 0; i < toSend.length; i += batchSize) {
    const batch = toSend.slice(i, i + batchSize);
    const endpoint = `${url}/api/sync/uploads?secret=${encodeURIComponent(secret)}`;
    console.log(`Šaljem batch ${i / batchSize + 1} (${batch.length} fajlova)…`);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: batch }),
    });
    const text = await res.text();
    console.log(res.status, text.slice(0, 500));
    if (!res.ok) process.exit(1);
  }

  console.log("Gotovo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
