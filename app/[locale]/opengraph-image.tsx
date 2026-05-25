import { renderLocaleShareOgImage } from "@/lib/og-share-image";
import { getShareCopy } from "@/lib/social-share-metadata";
import { isLocale } from "@/lib/i18n";

export const runtime = "nodejs";
export const alt = "Human Reproduction Center · Budva";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ locale: string }> };

export default async function OpenGraphImage({ params }: Props) {
  const { locale } = await params;
  return renderLocaleShareOgImage(locale);
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "me";
  return { title: getShareCopy(loc).ogTitle };
}
