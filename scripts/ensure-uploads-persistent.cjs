/**
 * Prije builda: kreira trajni uploads folder i prebaci postojeće fajlove iz public/uploads.
 * Produkcija (Hostinger): ../private/uploads — preživljava git deploy.
 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();

function getUploadsRoot() {
  const env = process.env.MEDIA_UPLOADS_DIR?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.join(cwd, env);
  }
  if (process.env.NODE_ENV === "production") {
    return path.join(cwd, "..", "private", "uploads");
  }
  return path.join(cwd, "public", "uploads");
}

function copyIfMissing(src, dst) {
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return;
  if (fs.existsSync(dst)) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

const persistent = getUploadsRoot();
fs.mkdirSync(persistent, { recursive: true });

const legacyPublic = path.join(cwd, "public", "uploads");
if (fs.existsSync(legacyPublic)) {
  for (const name of fs.readdirSync(legacyPublic)) {
    if (name === ".gitkeep") continue;
    copyIfMissing(
      path.join(legacyPublic, name),
      path.join(persistent, name),
    );
  }
}

console.log("[ensure-uploads] root:", persistent);
