export function parseCompoundToken(
  raw: string | null | undefined,
): { id: string; secretHex: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const secretHex = raw.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (!/^[0-9a-f]{64}$/i.test(secretHex)) return null;
  return { id, secretHex: secretHex.toLowerCase() };
}
