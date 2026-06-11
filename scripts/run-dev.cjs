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

/** build + dev bez clean → MODULE_NOT_FOUND za ./NNNN.js ili vendor-chunks na Windowsu. */
function isStaleNextCache() {
  const nextDir = path.join(process.cwd(), ".next");
  if (!fs.existsSync(nextDir)) return false;

  if (fs.existsSync(path.join(nextDir, "BUILD_ID"))) return true;

  const vendorLucide = path.join(nextDir, "server", "vendor-chunks", "lucide-react.js");
  const localePageJs = path.join(nextDir, "server", "app", "[locale]", "page.js");
  if (fs.existsSync(localePageJs)) {
    try {
      const src = fs.readFileSync(localePageJs, "utf8");
      if (src.includes("vendor-chunks/lucide-react.js") && !fs.existsSync(vendorLucide)) {
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  const runtimeCandidates = [
    path.join(nextDir, "server", "webpack-runtime.js"),
    path.join(nextDir, "server", "pages", "_document.js"),
  ];
  for (const runtimePath of runtimeCandidates) {
    if (!fs.existsSync(runtimePath)) continue;
    let src = "";
    try {
      src = fs.readFileSync(runtimePath, "utf8");
    } catch {
      continue;
    }
    const dir = path.dirname(runtimePath);
    for (const m of src.matchAll(/require\("\.\/(\d+\.js)"\)/g)) {
      const chunk = m[1];
      if (chunk && !fs.existsSync(path.join(dir, chunk))) {
        return true;
      }
    }
  }

  return false;
}

function removeNextCache() {
  for (const rel of [".next", path.join("node_modules", ".cache")]) {
    try {
      fs.rmSync(path.join(process.cwd(), rel), { recursive: true, force: true });
      console.log("Uklonjeno:", rel);
    } catch {
      /* ignore */
    }
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

  if (isStaleNextCache()) {
    console.log(
      "Neispravan .next cache (production build ili nedostaju webpack chunk fajlovi) — brišem prije dev servera.\n" +
        "  Savjet: nakon `npm run build` koristi `npm run dev:fresh`.\n",
    );
    removeNextCache();
  }
}

// Prije dev servera: povuci sadržaj sa produkcije (blog, stranice, footer tekstovi).
// Isključi: SYNC_ON_DEV=0 u .env
if (process.env.SYNC_ON_DEV !== "0") {
  try {
    execFileSync(
      "node",
      ["--env-file=.env", "scripts/sync-from-prod.mjs"],
      { cwd: process.cwd(), stdio: "inherit" },
    );
  } catch {
    console.warn(
      "\n[dev] Sync sa produkcijom nije uspio (deploy još nije završen?). Nastavljam...\n",
    );
  }
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
