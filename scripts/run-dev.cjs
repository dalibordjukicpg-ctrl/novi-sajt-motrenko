/**
 * Pokreće next dev na portu iz DEV_PORT (.env), podrazumijevano 7392.
 * --turbo  → --turbopack
 * --clean  → briše .next i node_modules/.cache prije starta
 */
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  override: true,
});

const port = process.env.DEV_PORT?.trim() || "7392";
const turbo = process.argv.includes("--turbo");
const clean = process.argv.includes("--clean");

/**
 * Zaustavlja proces(e) koji slušaju TCP port (npr. stari `next dev`).
 * Bez toga: čišćenje `.next` dok server radi → ENOENT routes-manifest → 500.
 */
function killListenersOnPort(p) {
  if (process.platform !== "win32") return;
  try {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${p} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: "ignore" },
    );
  } catch {
    /* npr. nema slušalaca ili stariji Windows */
  }
}

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* prazan busy-wait — dovoljno za oslobađanje porta na Windowsu */
  }
}

if (clean) {
  console.log("Zaustavljam eventualni stari server na portu", port, "…");
  killListenersOnPort(port);
  sleepMs(800);
  for (const rel of [".next", path.join("node_modules", ".cache")]) {
    try {
      fs.rmSync(path.join(process.cwd(), rel), {
        recursive: true,
        force: true,
      });
      console.log("Uklonjeno:", rel);
    } catch {
      /* */
    }
  }
} else {
  killListenersOnPort(port);
  sleepMs(400);
}

const args = turbo
  ? ["next", "dev", "--turbopack", "-p", port]
  : ["next", "dev", "-p", port];

console.log(`Next dev → http://localhost:${port}\n`);

const child = spawn("npx", args, {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 0));
