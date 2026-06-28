import { resolveUpitnikNotifyInbox } from "@/lib/email/resolve-notify-inbox";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";

export function questionnairePdfBranding() {
  const siteUrl = getSiteUrl();
  const addr = process.env.CONTACT_PDF_CLINIC_ADDRESS?.trim();
  const notify = resolveUpitnikNotifyInbox();
  return {
    clinicName:
      process.env.CONTACT_PDF_CLINIC_NAME?.trim() ||
      "Human Reproduction Center",
    clinicEmail:
      process.env.CONTACT_PDF_CLINIC_EMAIL?.trim() || notify,
    clinicWeb: siteUrl || PRODUCTION_SITE_URL,
    clinicAddress: addr && addr.length > 0 ? addr : undefined,
  };
}
