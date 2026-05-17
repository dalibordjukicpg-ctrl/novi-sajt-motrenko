/**
 * Pokreće next dev na portu iz DEV_PORT (.env), podrazumijevano 7392.
 * --turbo  → --turbopack
 * --clean  → briše .next i node_modules/.cache prije starta
 */
const { spawn, execFileSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  override: true,
});

const port = process.env.DEV_PORT?.trim() || "7392";
const turbo = process.argv.includes("--turbo");
const clean = process.argv.includes("--clean");
/** 0.0.0.0 = telefon na istom WiFi može http://TVoja-LAN-IP:port (Windows Firewall?) */
const host = process.env.DEV_HOST?.trim() || "0.0.0.0";

function firstLanIPv4() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const a of list ?? []) {
      const fam = String(a.family);
      const isV4 = fam === "IPv4" || fam === "4";
      if (!isV4 || a.internal) continue;
      return a.address;
    }
  }
  return null;
}

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
  sleepMs(1500);
  for (const rel of [".next", path.join("node_modules", ".cache")]) {
    const target = path.join(process.cwd(), rel);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        fs.rmSync(target, { recursive: true, force: true });
        console.log("Uklonjeno:", rel);
        break;
      } catch {
        sleepMs(400);
      }
    }
  }
} else {
  killListenersOnPort(port);
  sleepMs(400);
}

const args = turbo
  ? ["next", "dev", "--turbopack", "-H", host, "-p", port]
  : ["next", "dev", "-H", host, "-p", port];

const lan = firstLanIPv4();
console.log(`Next dev → http://localhost:${port}`);
if (lan && host !== "127.0.0.1") {
  console.log(`Sa telefona (isti Wi-Fi): http://${lan}:${port}/me`);
  console.log(
    "(Ako ne učita: Windows „Windows Defender Firewall“ → dopusti Node ili port " +
      port +
      " za privatne mreže; telefon mora biti na istom WiFi, ne na mobilnim podacima.)\n",
  );
} else {
  console.log("");
}

const child = spawn("npx", args, {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
  /** Isključi Next 15 devtools segment bundler na Windowsu kad pravi 500 + „SegmentViewNode“ greške. */
  env: {
    ...process.env,
    NEXT_DISABLE_DEVTOOLS:
      process.env.NEXT_DISABLE_DEVTOOLS !== undefined
        ? process.env.NEXT_DISABLE_DEVTOOLS
        : "1",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
