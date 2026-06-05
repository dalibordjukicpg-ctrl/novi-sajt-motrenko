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
  const [row] = await db
    .select({ body: sitePageTranslations.body })
    .from(sitePageTranslations)
    .where(eq(sitePageTranslations.pageId, page!.id))
    .limit(1);
  const body = row?.body ?? "";
  const start = body.indexOf("ICSI");
  console.log("=== RAW ICSI section ===");
  console.log(body.slice(start, start + 1200));
  const out = preparePublicHtml(body, "me");
  const ostart = out.indexOf("ICSI");
  console.log("\n=== RENDERED ICSI section ===");
  console.log(out.slice(ostart, ostart + 1200));
}

main().finally(() => process.exit(0));
