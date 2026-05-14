import { z } from "zod";

const emptyToUndef = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? undefined : s;
};

const mediaId = z.preprocess(
  emptyToUndef,
  z.string().uuid().optional(),
);

const htmlSnippet = z.preprocess(
  (v) => (typeof v === "string" ? v : ""),
  z.string().max(50_000),
);

export const siteGlobalsFormSchema = z.object({
  logoMediaId: mediaId,
  faviconMediaId: mediaId,
  heroBgMediaId: mediaId,
  analyticsHeadHtml: htmlSnippet,
  analyticsBodyHtml: htmlSnippet,
});

export type SiteGlobalsFormInput = z.infer<typeof siteGlobalsFormSchema>;

export function parseSiteGlobalsFormData(
  formData: FormData,
):
  | { success: true; data: SiteGlobalsFormInput }
  | { success: false; error: string } {
  const raw = {
    logoMediaId: formData.get("logoMediaId"),
    faviconMediaId: formData.get("faviconMediaId"),
    heroBgMediaId: formData.get("heroBgMediaId"),
    analyticsHeadHtml: formData.get("analyticsHeadHtml"),
    analyticsBodyHtml: formData.get("analyticsBodyHtml"),
  };
  const parsed = siteGlobalsFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(" "),
    };
  }
  return { success: true, data: parsed.data };
}
