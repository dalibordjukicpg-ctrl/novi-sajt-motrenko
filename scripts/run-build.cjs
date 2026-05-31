/**
 * Production build wrapper for Hostinger / CI.
 * Logs Node version and raises heap limit to avoid OOM during `next build`.
 */
const { spawnSync } = require("child_process");

const cwd = process.cwd();
const nodeVersion = process.version;
const parsed = /^v(\d+)\.(\d+)/.exec(nodeVersion);
const major = parsed ? Number.parseInt(parsed[1], 10) : 0;
const minor = parsed ? Number.parseInt(parsed[2], 10) : 0;

console.log("[run-build] cwd:", cwd);
console.log("[run-build] node:", nodeVersion);

if (!Number.isFinite(major) || major < 18 || (major === 18 && minor < 18)) {
  console.error(
    "[run-build] FATAL: Node 18.18+ required. Hostinger panel → Node 20.",
  );
  process.exit(1);
}

if (major < 20) {
  console.warn("[run-build] WARN: Node 20+ preporučen za Next.js 15.");
}

const heapMb = process.env.BUILD_HEAP_MB?.trim() || "2048";
const prev = process.env.NODE_OPTIONS?.trim() ?? "";
process.env.NODE_OPTIONS = [
  prev,
  `--max-old-space-size=${heapMb}`,
]
  .filter(Boolean)
  .join(" ");

const fontCopy = spawnSync(process.execPath, ["scripts/copy-pdf-fonts.cjs"], {
  stdio: "inherit",
  cwd,
  env: process.env,
});
if (fontCopy.status !== 0) {
  console.warn("[run-build] copy-pdf-fonts nije uspio — PDF UTF-8 može biti neispravan.");
}

const ensureUploads = spawnSync(process.execPath, ["scripts/ensure-uploads-persistent.cjs"], {
  stdio: "inherit",
  cwd,
  env: process.env,
});
if (ensureUploads.status !== 0) {
  console.warn("[run-build] ensure-uploads nije uspio — uploadi možda neće preživjeti deploy.");
}

const ensureBookingAttachments = spawnSync(
  process.execPath,
  ["scripts/ensure-booking-attachments.cjs"],
  {
    stdio: "inherit",
    cwd,
    env: process.env,
  },
);
if (ensureBookingAttachments.status !== 0) {
  console.warn(
    "[run-build] ensure-booking-attachments nije uspio — prilozi u prijavnici možda neće raditi.",
  );
}

const ensureAdminOtp = spawnSync(
  process.execPath,
  ["scripts/ensure-admin-login-otp.cjs"],
  {
    stdio: "inherit",
    cwd,
    env: process.env,
  },
);
if (ensureAdminOtp.status !== 0) {
  console.warn(
    "[run-build] ensure-admin-login-otp nije uspio — admin OTP login možda neće raditi dok se ne pokrene migracija 0021.",
  );
}

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error("[run-build] FATAL: next is not installed. Run npm ci first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  cwd,
  env: process.env,
});

if (result.error) {
  console.error("[run-build] spawn error:", result.error);
  process.exit(1);
}

const code = result.status ?? 1;
if (code !== 0) {
  console.error("[run-build] next build failed with code:", code);
}
process.exit(code);
