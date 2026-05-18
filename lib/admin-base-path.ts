/**
 * Privatna admin ruta.
 *
 * Stvarni fajl-tree i dalje stoji u `app/admin/...`, ali se javna URL putanja
 * mijenja kroz env `ADMIN_BASE_PATH`. `middleware.ts` interno radi rewrite
 * (`/hrc-panel-74x/*` → `/admin/*`) i istovremeno blokira direktan pristup
 * starom `/admin/*` URL-u (vraća 404).
 *
 * Promjena u produkciji:
 *   .env  →  ADMIN_BASE_PATH=/neki-novi-tajni-put
 *   restart Next servera
 *
 * Ograničenja:
 *   - početak sa `/`, samo `[a-z0-9\-]`, max 64 karaktera
 *   - ne smije biti `/admin`, `/api`, `/_next`, ili nešto što kolidira sa javnim URL-om
 */

const DEFAULT_ADMIN_BASE_PATH = "/hrc-panel-74x";

function normalize(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return DEFAULT_ADMIN_BASE_PATH;
  let p = trimmed.toLowerCase();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+$/, "");
  if (!/^\/[a-z0-9][a-z0-9\-/]*$/.test(p) || p.length > 64) {
    return DEFAULT_ADMIN_BASE_PATH;
  }
  const reserved = ["/admin", "/api", "/_next", "/me", "/en", "/ru"];
  if (reserved.some((r) => p === r || p.startsWith(`${r}/`))) {
    return DEFAULT_ADMIN_BASE_PATH;
  }
  return p;
}

/**
 * Javna admin baza (npr. `/hrc-panel-74x`).
 *
 * Učitavamo iz dvije env varijable:
 *   - `ADMIN_BASE_PATH` (server-only) — primarni izvor
 *   - `NEXT_PUBLIC_ADMIN_BASE_PATH` — da bi i klijent kompoenente znale rutu
 *
 * Ako se mijenja, postavi obje vrijednosti istovremeno u `.env`.
 */
export const ADMIN_BASE_PATH = normalize(
  process.env.ADMIN_BASE_PATH ?? process.env.NEXT_PUBLIC_ADMIN_BASE_PATH,
);

/**
 * Pomoćnik za izgradnju admin URL-a iz pod-puta.
 *
 * @example
 *   adminPath()            → "/hrc-panel-74x"
 *   adminPath("login")     → "/hrc-panel-74x/login"
 *   adminPath("/users")    → "/hrc-panel-74x/users"
 *   adminPath("posts/abc") → "/hrc-panel-74x/posts/abc"
 */
export function adminPath(sub: string = ""): string {
  const s = sub.trim();
  if (!s) return ADMIN_BASE_PATH;
  const clean = s.startsWith("/") ? s : `/${s}`;
  return `${ADMIN_BASE_PATH}${clean}`;
}

/** Da li je dati path (javni URL) unutar admin zone. */
export function isAdminBasePathPrefix(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname === ADMIN_BASE_PATH ||
    pathname.startsWith(`${ADMIN_BASE_PATH}/`)
  );
}

/** Pretvori javni admin URL u interni `/admin/...` rewrite target. */
export function toInternalAdminPath(pathname: string): string {
  if (!isAdminBasePathPrefix(pathname)) return pathname;
  const sub = pathname.slice(ADMIN_BASE_PATH.length);
  return `/admin${sub}`;
}

/** Javne admin podstranice (login flow). */
const PUBLIC_ADMIN_SUBPATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export function isPublicAdminSubpath(internalPathname: string): boolean {
  if (!internalPathname.startsWith("/admin")) return false;
  const sub = internalPathname.slice("/admin".length) || "/";
  return PUBLIC_ADMIN_SUBPATHS.some(
    (p) => sub === p || sub.startsWith(`${p}/`),
  );
}
