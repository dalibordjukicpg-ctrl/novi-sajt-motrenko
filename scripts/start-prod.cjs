/**
 * Hostinger Node: proces MORA slušati na portu koji Hostinger dodijeli.
 * Panel obično koristi: npm run start -- -p $PORT
 * (PORT ide kao CLI argument, ne uvijek kao env varijabla.)
 */
const { spawn } = require("child_process");
const path = require("path");

function resolvePort() {
  if (process.env.PORT?.trim()) return process.env.PORT.trim();
  const pFlag = process.argv.indexOf("-p");
  if (pFlag >= 0 && process.argv[pFlag + 1]) return process.argv[pFlag + 1];
  const portFlag = process.argv.indexOf("--port");
  if (portFlag >= 0 && process.argv[portFlag + 1]) return process.argv[portFlag + 1];
  return "3000";
}

const host = process.env.HOST?.trim() || "0.0.0.0";
const port = resolvePort();
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

console.log(`[start-prod] PORT=${port} HOST=${host}`);
console.log(`[start-prod] ${nextBin} start -H ${host} -p ${port}`);

const child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", port], {
  stdio: "inherit",
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 0));
