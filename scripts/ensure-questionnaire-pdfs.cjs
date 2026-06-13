/**
 * Kreira trajni folder za PDF arhivu poslanih upitnika.
 * Produkcija (Hostinger): ../private/questionnaire-pdfs
 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();

function getRoot() {
  const env = process.env.QUESTIONNAIRE_PDFS_DIR?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.join(cwd, env);
  }
  if (process.env.NODE_ENV === "production") {
    return path.join(cwd, "..", "private", "questionnaire-pdfs");
  }
  return path.join(cwd, "var", "questionnaire-pdfs");
}

const root = getRoot();
fs.mkdirSync(root, { recursive: true });
console.log("[ensure-questionnaire-pdfs] root:", root);
