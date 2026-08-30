#!/usr/bin/env node
/**
 * Upload nove fotografije članova tima iz `team-photos-inbox/`.
 *
 * Imenuj fajlove po slug-u ili prepoznatljivom dijelu imena:
 *   lazovic.jpg
 *   gzivoda.png
 *   milenko-tadic.jpg
 *   jasna-mijanovic.jpg
 *
 *   node --env-file=.env scripts/upload-team-photos.mjs
 *   node --env-file=.env scripts/upload-team-photos.mjs --dry-run
 *   node --env-file=.env scripts/upload-team-photos.mjs --no-prod
 */
import { createConnection } from "mysql2/promise";
import { randomUUID } from "crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { join, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { parseDbFromEnv, prodConfig } from "./lib/content-sync.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INBOX = join(ROOT, "team-photos-inbox");
const UPLOADS = join(ROOT, "public", "uploads");

config({ path: join(ROOT, ".env"), override: true });

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const ALIASES = {
  "biografija-zeljko-lazovic": ["lazovic", "zeljko", "zeljko-lazovic", "biografija-zeljko-lazovic"],
  "dr-ivan": ["gzivoda", "gazivoda", "ivan", "ivan-gzivoda", "ivan-gazivoda", "dr-ivan"],
  "dr-milenko-tadic": ["milenko", "tadic", "milenko-tadic", "dr-milenko-tadic"],
  "dr-marija-petricevic": ["marija", "petricevic", "marija-petricevic", "dr-marija-petricevic"],
  "jasna-mijanovic-embriolog": ["jasna", "mijanovic", "jasna-mijanovic", "jasna-mijanovic-embriolog"],
  "dr-ana-bogdanovic": ["ana", "bogdanovic", "ana-bogdanovic", "dr-ana-bogdanovic"],
  "boris-kojicic": ["boris", "kojicic", "boris-kojicic"],
  "mr-sci-dr-tatjana-motrenko-simic": ["motrenko", "tatjana", "motrenko-simic"],
  "jelena-popovic-klinicki-embriolog": ["jelena", "popovic", "jelena-popovic"],
  "sasa-lozo": ["sasa", "lozo", "sasa-lozo"],
  "milena-radulovic-visa-med-sestra-glavna-sestra": ["milena", "radulovic", "milena-radulovic"],
  "maja-scekic-visa-med-sestra-koordinator-za-ivf": ["maja", "scekic", "maja-scekic"],
  "marina-colic-medicinski-tehnicar-sestra": ["marina", "colic", "marina-colic"],
  "aleksandra-obradovic-medicinska-sestra-tehnicar": ["aleksandra", "obradovic", "aleksandra-obradovic"],
};

function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mimeFromExt(ext) {
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

function matchMember(stem, members) {
  const n = norm(stem);
  if (!n) return null;

  const bySlug = members.find((m) => m.slug === n || m.slug.includes(n) || n.includes(m.slug));
  if (bySlug) return bySlug;

  for (const m of members) {
    const titleNorm = norm(m.title);
    if (titleNorm.includes(n) || n.includes(titleNorm.split("-")[0])) return m;
  }

  for (const [slug, keys] of Object.entries(ALIASES)) {
    if (keys.some((k) => n.includes(k) || k.includes(n))) {
      const hit = members.find((m) => m.slug === slug);
      if (hit) return hit;
    }
  }

  return null;
}

async function pushFilesToProd(files) {
  const { url, secret } = prodConfig();
  const batchSize = 5;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize).map((storageKey) => {
      const abs = join(ROOT, "public", storageKey);
      const buf = readFileSync(abs);
      return { storageKey, dataBase64: buf.toString("base64") };
    });
    const endpoint = `${url}/api/sync/uploads?secret=${encodeURIComponent(secret)}`;
    console.log(`Šaljem na produkciju (${batch.length} fajlova)…`);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: batch }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Upload prod HTTP ${res.status}: ${text.slice(0, 300)}`);
    console.log("  OK:", text.slice(0, 200));
  }
}

async function pushContentToProd() {
  const { exportContentFromConnection } = await import("./lib/content-sync.mjs");
  const { url, secret } = prodConfig();
  const conn = await createConnection(parseDbFromEnv());
  let sql;
  try {
    sql = await exportContentFromConnection(conn);
  } finally {
    await conn.end();
  }
  const endpoint = `${url}/api/sync/content?secret=${encodeURIComponent(secret)}`;
  console.log("Šaljem CMS sadržaj (media + posts) na produkciju…");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/sql" },
    body: sql,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Content sync HTTP ${res.status}: ${text.slice(0, 300)}`);
  console.log("  OK:", text.slice(0, 120));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const noProd = process.argv.includes("--no-prod");

  mkdirSync(INBOX, { recursive: true });
  mkdirSync(UPLOADS, { recursive: true });

  const conn = await createConnection(parseDbFromEnv());
  const [members] = await conn.query(
    `SELECT p.id, pt.slug, pt.title, p.cover_media_id AS coverMediaId
     FROM posts p
     JOIN post_translations pt ON pt.post_id = p.id AND pt.locale = 'me'
     WHERE p.content_role = 'team' AND p.published = 1
     ORDER BY pt.title`,
  );

  const inboxFiles = readdirSync(INBOX).filter((name) => {
    const ext = extname(name).toLowerCase();
    return IMAGE_EXT.has(ext) && !name.startsWith(".") && !name.startsWith("SKIP-");
  });

  if (inboxFiles.length === 0) {
    console.log(`Nema slika u folderu:\n  ${INBOX}`);
    console.log("\nDodaj fotografije (jpg/png) i pokreni ponovo.");
    console.log("Primjer imena: lazovic.jpg, gzivoda.png, jasna-mijanovic.jpg");
    await conn.end();
    process.exit(0);
  }

  console.log(`Pronađeno ${inboxFiles.length} slika u inbox-u.\n`);

  const toProd = [];
  let updated = 0;

  for (const name of inboxFiles) {
    const stem = basename(name, extname(name));
    const member = matchMember(stem, members);
    if (!member) {
      console.warn(`⚠ Nije pronađen član tima za: ${name}`);
      console.warn("  Dostupni slug-ovi:");
      for (const m of members) console.warn(`    - ${m.slug} (${m.title})`);
      continue;
    }

    const src = join(INBOX, name);
    const ext = extname(name).toLowerCase();
    const id = randomUUID();
    const storageKey = `uploads/${id}${ext}`;
    const dest = join(UPLOADS, `${id}${ext}`);
    const kb = Math.round(statSync(src).size / 1024);

    console.log(`→ ${name} (${kb} KB)`);
    console.log(`  Član: ${member.title}`);
    console.log(`  Slug: ${member.slug}`);

    if (dryRun) {
      console.log("  [dry-run] preskačem upis\n");
      continue;
    }

    copyFileSync(src, dest);

    await conn.query(
      `INSERT INTO media (id, filename, storage_key, mime_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, NOW(3))`,
      [id, name.slice(0, 512), storageKey, mimeFromExt(ext), statSync(dest).size],
    );

    await conn.query(`UPDATE posts SET cover_media_id = ?, updated_at = NOW(3) WHERE id = ?`, [
      id,
      member.id,
    ]);

    const archive = join(INBOX, "uploaded", name);
    mkdirSync(join(INBOX, "uploaded"), { recursive: true });
    copyFileSync(src, archive);
    writeFileSync(join(INBOX, "uploaded", `${stem}.uploaded.txt`), storageKey);

    toProd.push(storageKey);
    updated += 1;
    console.log(`  Sačuvano: /${storageKey}\n`);
  }

  await conn.end();

  if (updated === 0) {
    console.log("Ništa nije uploadovano.");
    process.exit(dryRun ? 0 : 1);
  }

  console.log(`Lokalno ažurirano: ${updated} profila.`);

  if (!noProd && !dryRun) {
    await pushFilesToProd(toProd);
    await pushContentToProd();
    console.log("\nGotovo — slike i baza su na produkciji.");
  } else if (dryRun) {
    console.log("\nDry-run završen.");
  } else {
    console.log("\nLokalno gotovo (--no-prod: nije slano na produkciju).");
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
