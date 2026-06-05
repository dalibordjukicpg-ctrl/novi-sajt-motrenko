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
  if (!page) process.exit(1);

  const [row] = await db
    .select({ body: sitePageTranslations.body })
    .from(sitePageTranslations)
    .where(eq(sitePageTranslations.pageId, page.id))
    .limit(1);

  const body = row?.body ?? "";
  console.log("RAW occurrences:");
  let i = 0;
  let pos = 0;
  while ((pos = body.toLowerCase().search(/youtube|youtu\.be|nhttps/i, pos)) >= 0 && i < 15) {
    console.log(`--- ${i} @${pos} ---`);
    console.log(body.slice(pos, pos + 200).replace(/\s+/g, " "));
    pos += 4;
    i++;
  }

  const out = preparePublicHtml(body, "me");
  console.log("\nRENDERED occurrences:");
  i = 0;
  pos = 0;
  while ((pos = out.toLowerCase().search(/youtube|youtu\.be|nhttps|iframe/i, pos)) >= 0 && i < 15) {
    console.log(`--- ${i} @${pos} ---`);
    console.log(out.slice(pos, pos + 200).replace(/\s+/g, " "));
    pos += 4;
    i++;
  }
  console.log("\nhas iframe:", out.includes("<iframe"));
}

main().catch(console.error).finally(() => process.exit(0));
