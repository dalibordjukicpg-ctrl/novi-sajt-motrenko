import { revalidatePath } from "next/cache";

import { locales } from "@/lib/i18n";
import type { ArticleFormValues } from "@/lib/validations/article";

export function revalidateArticlePaths(data: ArticleFormValues): void {
  revalidatePath("/");
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/posts/${data[loc].slug.trim()}`);
  }
}

/** Nakon izmjene tekstova ili menija prezentacionog sajta. */
export function revalidatePublicSite(): void {
  revalidatePath("/");
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
  }
}
