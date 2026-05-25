import { renderLocaleShareOgImage } from "@/lib/og-share-image";

export const runtime = "nodejs";
export const alt = "Human Reproduction Center · Budva";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ locale: string }> };

export default async function TwitterImage({ params }: Props) {
  const { locale } = await params;
  return renderLocaleShareOgImage(locale);
}
