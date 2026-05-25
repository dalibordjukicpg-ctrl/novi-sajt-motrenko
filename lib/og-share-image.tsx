import { ImageResponse } from "next/og";

import { isLocale } from "@/lib/i18n";
import { getShareCopy } from "@/lib/social-share-metadata";

const { buildOgSharePngBuffer } = require("@/lib/og-share-composite.cjs") as {
  buildOgSharePngBuffer: (locale: string) => Promise<Buffer>;
};

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export async function renderLocaleShareOgImage(locale: string) {
  const loc = isLocale(locale) ? locale : "me";
  const png = await buildOgSharePngBuffer(loc);
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={dataUrl} alt={getShareCopy(loc).ogTitle} width={1200} height={630} />
    ),
    { ...OG_IMAGE_SIZE },
  );
}
