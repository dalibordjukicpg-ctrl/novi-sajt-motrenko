#!/usr/bin/env node
/**
 * Brza provjera da li produkcija servira očekivani build.
 * npm run verify:prod
 *
 * Napomena: curl/grep na cijelom HTML-u može naći stringove u RSC payloadu.
 * Kritične provjere koriste DOM-relevantne isečke (footer, breadcrumb nav).
 */
import { PRODUCTION_SITE_URL } from "./lib/content-sync.mjs";

const BASE = (process.env.PROD_SITE_URL || PRODUCTION_SITE_URL).replace(/\/$/, "");
const TIMEOUT_MS = 25_000;

/** @typedef {{ name: string; ok: boolean; detail: string; warn?: boolean }} Check */

/** @param {string} path */
async function fetchPath(path) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "HRC-verify-prod/1.0" },
    });
    const text = await res.text();
    return { url, status: res.status, text, ok: res.ok };
  } finally {
    clearTimeout(timer);
  }
}

/** @param {string} html @param {string} marker */
function sliceFrom(html, marker, maxLen = 20_000) {
  const i = html.indexOf(marker);
  if (i < 0) return "";
  return html.slice(i, i + maxLen);
}

/** @param {string} html */
function extractBreadcrumbNav(html) {
  const m = html.match(/<nav[^>]*aria-label="Putanja"[\s\S]*?<\/nav>/i);
  return m?.[0] ?? "";
}

/** @param {Check[]} checks */
function report(checks) {
  let failed = 0;
  let warned = 0;
  for (const c of checks) {
    const tag = c.ok ? (c.warn ? "WARN" : " OK ") : "FAIL";
    console.log(`[${tag}] ${c.name}`);
    console.log(`       ${c.detail}`);
    if (!c.ok) failed += 1;
    else if (c.warn) warned += 1;
  }
  console.log("");
  if (failed > 0) {
    console.error(`verify:prod — ${failed} provjera nije prošlo.`);
    process.exit(1);
  }
  if (warned > 0) {
    console.log(`verify:prod — sve kritične provjere OK (${warned} upozorenje/a).`);
  } else {
    console.log("verify:prod — sve provjere prošle.");
  }
}

console.log(`Provjera produkcije: ${BASE}\n`);

/** @type {Check[]} */
const checks = [];

try {
  const health = await fetchPath("/api/health");
  checks.push({
    name: "API health",
    ok: health.ok && health.text.includes('"ok":true'),
    detail: health.ok
      ? `HTTP ${health.status} — ${health.text.slice(0, 80)}`
      : `HTTP ${health.status}`,
  });
} catch (e) {
  checks.push({
    name: "API health",
    ok: false,
    detail: e instanceof Error ? e.message : String(e),
  });
}

const pages = [
  { path: "/me", label: "Početna" },
  { path: "/me/s/kontakt", label: "Kontakt" },
  { path: "/me/s/tim", label: "Tim" },
];

for (const { path, label } of pages) {
  try {
    const res = await fetchPath(path);
    if (!res.ok) {
      checks.push({
        name: `${label} (${path})`,
        ok: false,
        detail: `HTTP ${res.status}`,
      });
      continue;
    }

    const html = res.text;
    const footerChunk = sliceFrom(html, "site-footer-motrenko");
    const footerH2 =
      footerChunk.match(/class="mb-5 text-\[11px\] font-semibold uppercase[^"]*"/g)
        ?.length ?? 0;

    checks.push({
      name: `${label} — footer u DOM-u`,
      ok: html.includes("<footer") && footerH2 === 4,
      detail:
        footerH2 === 4
          ? "1× footer, 4 sekcije (Radno vrijeme, Pratite nas, Kontakt, O klinici)"
          : `footer h2 sekcija: ${footerH2} (očekivano 4)`,
    });

    checks.push({
      name: `${label} — footer bez FadeIn wrappera`,
      ok: !footerChunk.includes('class="fade-in"'),
      detail: footerChunk.includes('class="fade-in"')
        ? "Footer još koristi stari FadeIn client wrapper"
        : "Server footer OK",
    });

    if (path === "/me/s/kontakt") {
      checks.push({
        name: "Kontakt — honeypot label",
        ok: !html.includes("Ne popunjavati"),
        detail: html.includes("Ne popunjavati")
          ? 'Pronađen tekst "Ne popunjavati" (vidljiv ili u RSC)'
          : "Nema honeypot labela",
      });

      checks.push({
        name: "Kontakt — CTA „Pozovite odmah“",
        ok: html.includes("Pozovite odmah"),
        detail: html.includes("Pozovite odmah")
          ? "ContactPageCtas prisutan"
          : "Nedostaje CTA blok",
      });

      checks.push({
        name: "Kontakt — „Mobilni“ u footeru",
        ok: footerChunk.includes("Mobilni"),
        detail: footerChunk.includes("Mobilni")
          ? "Label Mobilni u footer kontaktu"
          : "Mobilni nije u footer isečku",
      });

      checks.push({
        name: "Kontakt — „Telefon 2“ u footeru",
        ok: !footerChunk.includes("Telefon 2"),
        detail: footerChunk.includes("Telefon 2")
          ? 'Još piše "Telefon 2"'
          : "Zamijenjeno sa Mobilni",
      });

      const fullPageTelefon2 = html.includes("Telefon 2");
      if (fullPageTelefon2 && !footerChunk.includes("Telefon 2")) {
        checks.push({
          name: "Kontakt — „Telefon 2“ u cijelom HTML-u (RSC)",
          ok: true,
          warn: true,
          detail:
            "String možda samo u RSC payloadu — provjeri DevTools Elements",
        });
      }
    }

    if (path === "/me/s/tim") {
      const nav = extractBreadcrumbNav(html);
      checks.push({
        name: "Tim — breadcrumb Početna / O nama / Tim",
        ok:
          nav.includes('href="/me"') &&
          /O nama/i.test(nav) &&
          nav.includes('aria-current="page"') &&
          /Tim/i.test(nav),
        detail: nav
          ? nav
              .replace(/></g, ">\n<")
              .split("\n")
              .slice(0, 12)
              .join("\n       ")
          : "Nav Putanja nije pronađen",
      });

      checks.push({
        name: "Tim — nema starog „O NAMA“ (uppercase)",
        ok: !nav.includes("O NAMA"),
        detail: nav.includes("O NAMA")
          ? "Još uppercase O NAMA u breadcrumbu"
          : "O nama format OK",
      });

      checks.push({
        name: "Tim — separator / (ne >)",
        ok: nav.includes("/") && !nav.includes("&gt;"),
        detail: nav.includes("&gt;")
          ? "Stari separator >"
          : "Separator / OK",
      });
    }
  } catch (e) {
    checks.push({
      name: `${label} (${path})`,
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}

report(checks);
