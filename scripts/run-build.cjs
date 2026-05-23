/**
 * Production build wrapper for Hostinger / CI.
 * Logs Node version and raises heap limit to avoid OOM during `next build`.
 */
const { spawnSync } = require("child_process");

const cwd = process.cwd();
const nodeVersion = process.version;

console.log("[run-build] cwd:", cwd);
console.log("[run-build] node:", nodeVersion);

const major = Number.parseInt(nodeVersion.slice(1), 10);
if (Number.isFinite(major) && major < 20) {
  console.error(
    "[run-build] FATAL: Node 20+ required (package.json engines). Hostinger panel → Node 20.",
  );
  process.exit(1);
}

const prev = process.env.NODE_OPTIONS?.trim() ?? "";
process.env.NODE_OPTIONS = [prev, "--max-old-space-size=4096"].filter(Boolean).join(" ");

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

process.exit(result.status ?? 1);
