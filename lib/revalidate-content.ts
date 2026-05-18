import { revalidatePath } from "next/cache";

import { locales } from "@/lib/i18n";
import type { ArticleFormValues } from "@/lib/validations/article";
import { shouldPersistArticleTranslation } from "@/lib/validations/article";

export function revalidateArticlePaths(data: ArticleFormValues): void {
  revalidatePath("/");
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
    if (!shouldPersistArticleTranslation(loc, data[loc])) continue;
    const slug = data[loc].slug.trim();
    if (slug.length > 0) {
      revalidatePath(`/${loc}/posts/${slug}`);
    }
  }
}

/** Nakon izmjene tekstova ili menija prezentacionog sajta. */
export function revalidatePublicSite(): void {
  revalidatePath("/");
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
  }
}
