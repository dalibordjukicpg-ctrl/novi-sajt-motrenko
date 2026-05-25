/**
 * Hostinger Node production start.
 *
 * Hostinger tokom builda drži STARI proces (sajt radi).
 * Kad deploy završi, ubije stari i pokrene novi — ako port/cwd nije OK → 503.
 *
 * Panel Start command: npm run start
 * (Hostinger dodaje -p $PORT kao argument ili PORT env.)
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function resolvePort() {
  if (process.env.PORT?.trim()) return process.env.PORT.trim();
  const pFlag = process.argv.indexOf("-p");
  if (pFlag >= 0 && process.argv[pFlag + 1]) return process.argv[pFlag + 1];
  const portFlag = process.argv.indexOf("--port");
  if (portFlag >= 0 && process.argv[portFlag + 1]) return process.argv[portFlag + 1];
  return "3000";
}

/** Hostinger Git deploy: build u `.builds/source/repository`, start ponekad iz `public_html`. */
function resolveAppRoot() {
  const startCwd = process.cwd();
  const candidates = new Set([
    startCwd,
    path.join(startCwd, ".builds", "source", "repository"),
    path.join(startCwd, "repository"),
    path.dirname(startCwd),
  ]);

  for (let dir = startCwd, i = 0; i < 6; i++) {
    candidates.add(dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const dir of candidates) {
    const buildId = path.join(dir, ".next", "BUILD_ID");
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(buildId) && fs.existsSync(pkg)) {
      return dir;
    }
  }

  return startCwd;
}

const cwd = resolveAppRoot();
const host = process.env.HOST?.trim() || "0.0.0.0";
const port = resolvePort();
const buildIdPath = path.join(cwd, ".next", "BUILD_ID");

process.env.NODE_ENV = "production";
process.env.PORT = port;
process.env.HOST = host;

console.log("[start-prod] cwd:", cwd);
if (cwd !== process.cwd()) {
  console.log("[start-prod] started from:", process.cwd(), "→ using app root:", cwd);
}
console.log("[start-prod] PORT:", port, "HOST:", host);

if (!fs.existsSync(buildIdPath)) {
  console.error(
    "[start-prod] FATAL: nema .next/BUILD_ID — build nije završio ili start ide iz pogrešnog foldera.",
  );
  console.error("[start-prod] Pokreni: npm run build");
  process.exit(1);
}

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error("[start-prod] FATAL: next paket nije instaliran (npm ci).");
  process.exit(1);
}

console.log("[start-prod] BUILD_ID ok, pokrećem:", nextBin);

const args = ["start", "-H", host, "-p", port];
console.log("[start-prod] args:", args.join(" "));

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  cwd,
  env: process.env,
});

child.on("error", (err) => {
  console.error("[start-prod] spawn error:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error("[start-prod] killed by signal:", signal);
    process.exit(1);
  }
  if (code && code !== 0) {
    console.error("[start-prod] next start exited with code:", code);
  }
  process.exit(code ?? 0);
});
