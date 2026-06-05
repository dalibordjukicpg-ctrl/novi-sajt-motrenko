import { eq } from "drizzle-orm";

import { extractYoutubeVideoIdFromNoisyText } from "../lib/youtube-hero";
import { db } from "../lib/db";
import { sitePageTranslations, sitePages } from "../lib/db/schema";

const ID_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

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
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = ID_RE.exec(body))) ids.add(m[1]!);
  console.log("Video IDs in IVF body:", [...ids]);

  // plain text links anywhere
  const plainRe = /[^\s"'<>]{0,20}(?:youtube|youtu\.be)[^\s"'<>]*/gi;
  const plain = [...body.matchAll(plainRe)].map((x) => x[0]);
  console.log("Plain youtube fragments:", plain.slice(0, 10));
}

main().finally(() => process.exit(0));
