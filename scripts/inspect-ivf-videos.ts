import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";
import { preparePublicHtml } from "../lib/public-cms-html";

async function main() {
  const [page] = await db
    .select({ id: sitePages.id })
    .from(sitePages)
    .where(eq(sitePages.slug, "ivf"))
    .limit(1);
  if (!page) return;

  const [row] = await db
    .select({ body: sitePageTranslations.body })
    .from(sitePageTranslations)
    .where(eq(sitePageTranslations.pageId, page.id))
    .limit(1);

  const body = row?.body ?? "";
  const markers = [
    "ICSI metodom",
    "Šta možemo",
    "Sta možemo",
    "wp-youtube",
    "data-youtube-url",
    "Neispravan",
    "Nemamo",
    "youtu",
    "iframe",
  ];
  for (const m of markers) {
    let pos = 0;
    let n = 0;
    while ((pos = body.indexOf(m, pos)) >= 0 && n < 5) {
      console.log(`[${m}] @${pos}:`, body.slice(pos, pos + 200).replace(/\s+/g, " "));
      pos += m.length;
      n++;
    }
  }

  const blockRe = /<div\b[^>]*wp-youtube-embed[^>]*>[\s\S]*?<\/div>/gi;
  const blocks = [...body.matchAll(blockRe)];
  console.log("\nYOUTUBE BLOCKS in DB:", blocks.length);
  blocks.forEach((m, i) => {
    console.log(` block ${i}:`, m[0]!.slice(0, 280).replace(/\s+/g, " "));
  });

  const out = preparePublicHtml(body, "me");
  const iframeCount = (out.match(/<iframe/gi) ?? []).length;
  const embedCount = (out.match(/wp-youtube-embed/gi) ?? []).length;
  console.log("\nRENDERED iframes:", iframeCount, "embeds:", embedCount);

  const idx2 = body.indexOf("možemo");
  if (idx2 >= 0) {
    console.log("\n=== Sekcija 'možemo' RAW ===");
    console.log(body.slice(idx2 - 80, idx2 + 600));
  }
}

main().finally(() => process.exit(0));
