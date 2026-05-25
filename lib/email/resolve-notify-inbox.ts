/** Podrazumijevani inbox za obavještenja sa javnih formi. */
export const DEFAULT_NOTIFY_INBOX = "info@humanreproduction.com";

/** Primalac iz env varijabli (preferirani tip forme → drugi → podrazumijevano). */
export function resolveNotifyInboxFromEnv(
  prefer: "booking" | "contact" = "contact",
): string {
  const order =
    prefer === "booking"
      ? (["BOOKING_NOTIFY_EMAIL", "CONTACT_FORM_NOTIFY_EMAIL"] as const)
      : (["CONTACT_FORM_NOTIFY_EMAIL", "BOOKING_NOTIFY_EMAIL"] as const);

  for (const key of order) {
    const v = process.env[key]?.trim();
    if (v && v.includes("@")) return v;
  }
  return DEFAULT_NOTIFY_INBOX;
}
