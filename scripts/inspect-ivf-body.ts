import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";

async function main() {
  const [page] = await db
    .select({ id: sitePages.id })
    .from(sitePages)
    .where(eq(sitePages.slug, "ivf"))
    .limit(1);
  if (!page) {
    console.log("no page");
    process.exit(1);
  }
  const rows = await db
    .select({ locale: sitePageTranslations.locale, body: sitePageTranslations.body })
    .from(sitePageTranslations)
    .where(eq(sitePageTranslations.pageId, page.id));

  for (const r of rows) {
    const body = r.body ?? "";
    if (r.locale === "me") {
      console.log("\n=== ME first 2500 chars ===");
      console.log(body.slice(0, 2500));
    }
    console.log(`\n=== ${r.locale} len=${body.length} ===`);
    const patterns = [
      /youtube/gi,
      /youtu\.be/gi,
      /Iu5mktOlaok/gi,
      /wp-youtube/gi,
      /nhttps/gi,
    ];
    for (const p of patterns) {
      const m = body.match(p);
      if (m) console.log(`  match ${p}: ${m.length}x`);
    }
    for (const term of ["ICSI", "nhttps", "youtu.be", "Iu5mktOlaokn", "watch?v="]) {
      const idx = body.indexOf(term);
      if (idx >= 0) {
        console.log(`  [${term}] @${idx}:`, body.slice(idx, idx + 140).replace(/\s+/g, " "));
      }
    }
    const idx = body.search(/youtube|youtu\.be|Iu5mktOlaok|wp-youtube|nhttps/i);
    if (idx >= 0) {
      console.log("  snippet:", body.slice(Math.max(0, idx - 60), idx + 220).replace(/\s+/g, " "));
    } else {
      console.log("  (no youtube markers)");
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
