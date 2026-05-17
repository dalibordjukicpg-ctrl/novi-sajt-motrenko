/** Lista javnih IP iz CMS-a (odvojeni zarezom, tačka-zarezom ili novim redom). */

function normalizeIpToken(ip: string): string {
  let t = ip.trim().toLowerCase();
  if (t.startsWith("[") && t.endsWith("]")) {
    t = t.slice(1, -1);
  }
  return t;
}

export function parseMaintenanceBypassIpList(
  raw: string | null | undefined,
): string[] {
  if (!raw) return [];
  const tokens = raw
    .split(/[\s,;]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(tokens.map(normalizeIpToken))];
}

export function clientIpBypassesMaintenance(
  clientIp: string,
  allowlistRaw: string | null | undefined,
): boolean {
  const allowed = parseMaintenanceBypassIpList(allowlistRaw);
  if (allowed.length === 0) return false;
  const c = normalizeIpToken(clientIp);
  if (!c || c === "unknown") return false;
  return allowed.includes(c);
}
