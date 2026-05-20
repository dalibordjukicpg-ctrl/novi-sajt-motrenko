/**
 * Hostinger Node: proces MORA slušati na process.env.PORT (dinamički port).
 * Panel: Start command → npm run start
 */
const { spawn } = require("child_process");

const host = process.env.HOST?.trim() || "0.0.0.0";
const port = process.env.PORT?.trim() || "3000";

console.log(`[start-prod] next start -H ${host} -p ${port}`);

const child = spawn(
  "npx",
  ["next", "start", "-H", host, "-p", port],
  { stdio: "inherit", shell: true, cwd: process.cwd() },
);

child.on("exit", (code) => process.exit(code ?? 0));
