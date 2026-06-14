/** Javni upload medicinske dokumentacije (forma za termin). Uključiti samo sa BOOKING_ATTACHMENTS_ENABLED=1. */
export function isBookingAttachmentsEnabled(): boolean {
  return process.env.BOOKING_ATTACHMENTS_ENABLED === "1";
}
