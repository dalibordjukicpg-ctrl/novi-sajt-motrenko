import { z } from "zod";

import { locales } from "@/lib/i18n";
import {
  SITE_STRING_GROUPS,
  type SiteStringGroupId,
  type SiteStringKey,
} from "@/lib/site-fields";

const urlOrEmpty = z
  .string()
  .max(2048)
  .refine(
    (s) => {
      const t = s.trim();
      return t.length === 0 || /^https?:\/\//i.test(t);
    },
    { message: "Mora biti prazno ili http(s) URL." },
  );

const textField = z.string().max(4000);

function fieldSchemaForKey(key: SiteStringKey): z.ZodString {
  if (key.startsWith("social.") || key === "contact.maps_href") {
    return urlOrEmpty;
  }
  return textField;
}

export function parseSiteStringGroupFromFormData(
  group: SiteStringGroupId,
  formData: FormData,
): { success: true; values: Record<string, string> } | { success: false; error: string } {
  const keys = SITE_STRING_GROUPS[group] as readonly SiteStringKey[];
  const shape: Record<string, z.ZodTypeAny> = {};
  const flat: Record<string, string> = {};

  for (const loc of locales) {
    for (const key of keys) {
      const name = `${loc}::${key}`;
      const raw = formData.get(name);
      const str = typeof raw === "string" ? raw : "";
      flat[name] = str;
      shape[name] = fieldSchemaForKey(key);
    }
  }

  const parsed = z.object(shape).strict().safeParse(flat);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" ");
    return { success: false, error: msg || "Validacija nije uspjela." };
  }
  return { success: true, values: parsed.data as Record<string, string> };
}
