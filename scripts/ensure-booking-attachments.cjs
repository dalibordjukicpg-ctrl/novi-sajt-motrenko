/**
 * Kreira trajni folder za priloge sa forme za termin.
 * Produkcija (Hostinger): ../private/booking-attachments
 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();

function getRoot() {
  const env = process.env.BOOKING_ATTACHMENTS_DIR?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.join(cwd, env);
  }
  if (process.env.NODE_ENV === "production") {
    return path.join(cwd, "..", "private", "booking-attachments");
  }
  return path.join(cwd, "var", "booking-attachments");
}

const root = getRoot();
fs.mkdirSync(root, { recursive: true });
console.log("[ensure-booking-attachments] root:", root);
