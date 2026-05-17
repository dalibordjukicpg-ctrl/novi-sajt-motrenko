import { redirect } from "next/navigation";

import { defaultLocale } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

/** Stari WP linkovi `/posts/slug` → `/[locale]/posts/slug`. */
export default async function LegacyPostRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/${defaultLocale}/posts/${encodeURIComponent(slug)}`);
}
