import { readFile } from "fs/promises";
import path from "path";

import { ImageResponse } from "next/og";

import { getShareCopy } from "@/lib/social-share-metadata";
import { isLocale } from "@/lib/i18n";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

async function loadLogoDataUrl(): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), "public", "logo-hrc-budva.png"),
    path.join(process.cwd(), "public", "uploads", "c76590fc-39ea-4868-94ef-3a3c9d5d3b9c.png"),
  ];
  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function renderLocaleShareOgImage(locale: string) {
  const loc = isLocale(locale) ? locale : "me";
  const copy = getShareCopy(loc);
  const logo = await loadLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, #fdf9f5 0%, #f3e8dc 42%, #fffaf6 100%)",
          padding: "56px 72px",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={480}
            height={300}
            style={{ objectFit: "contain", marginBottom: 28 }}
          />
        ) : (
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#e8682a",
              marginBottom: 28,
            }}
          >
            HRC
          </div>
        )}
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "#1a1208",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          {copy.ogTitle}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 26,
            color: "#5c4a3a",
            textAlign: "center",
            lineHeight: 1.35,
            maxWidth: 920,
          }}
        >
          {copy.ogDescription}
        </div>
        <div
          style={{
            marginTop: 32,
            padding: "10px 22px",
            borderRadius: 999,
            background: "rgba(232, 104, 42, 0.12)",
            color: "#c9561a",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 1.2,
          }}
        >
          humanreproduction.com
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
