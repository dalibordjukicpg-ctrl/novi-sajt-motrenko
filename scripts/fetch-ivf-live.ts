async function main() {
  const res = await fetch("http://localhost:7392/me/s/ivf", { cache: "no-store" });
  const html = await res.text();
  const checks = ["youtu.be", "nhttps", "Iu5mktOlaok", "watch?v=Iu5mktOlaok", "<iframe"];
  for (const c of checks) {
    console.log(c, html.includes(c) ? "YES" : "no");
  }
  const idx = html.indexOf("ICSI metodom");
  if (idx >= 0) console.log("\nLIVE snippet:\n", html.slice(idx, idx + 900));
}

main().catch(console.error);
