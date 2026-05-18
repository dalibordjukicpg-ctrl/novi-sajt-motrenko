/**
 * In-memory rate limit za login pokušaje.
 *
 * Šta radi:
 *   - Vodi kliznu evidenciju neuspjelih login pokušaja po ključu (IP[+email]).
 *   - Nakon `MAX_ATTEMPTS` neuspjeha unutar `WINDOW_MS` privremeno blokira ključ
 *     na `BLOCK_MS` milisekundi.
 *   - Uspješan login briše evidenciju za taj ključ.
 *
 * Ograničenje:
 *   - Stanje je u memoriji ovog procesa (jedan Node proces). Za više instanci
 *     u produkciji idealno je zamijeniti Redisom ili DB tabelom. Za jedan server
 *     ovo je dovoljno i ne traži schema-migraciju.
 *
 * Ne diramo bazu — sve čuvamo u procesnoj memoriji.
 */

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
const WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS ?? 15 * 60 * 1000); // 15 min
const BLOCK_MS = Number(process.env.LOGIN_BLOCK_MS ?? 15 * 60 * 1000); // 15 min

type Entry = {
  /** Tampuni vremena neuspjelih pokušaja (ms epoch). */
  attempts: number[];
  /** Kraj blokade (ms epoch), `0` = nije blokiran. */
  blockedUntil: number;
};

const store = new Map<string, Entry>();

function pruneOldAttempts(entry: Entry, now: number): void {
  const cutoff = now - WINDOW_MS;
  entry.attempts = entry.attempts.filter((t) => t >= cutoff);
}

/** Sweep starih ulaza svakih ~5 minuta. */
let lastSweep = 0;
function maybeSweep(now: number): void {
  if (now - lastSweep < 5 * 60 * 1000) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    pruneOldAttempts(entry, now);
    if (entry.attempts.length === 0 && entry.blockedUntil < now) {
      store.delete(key);
    }
  }
}

export type RateLimitState = {
  blocked: boolean;
  /** Sekundi do isteka blokade (≥ 0); 0 ako nije blokiran. */
  retryAfterSec: number;
  /** Koliko je još pokušaja preostalo prije blokade. */
  remaining: number;
};

function makeKey(ip: string | null, email: string | null): string {
  const safeIp = (ip ?? "no-ip").toLowerCase();
  const safeEmail = (email ?? "no-email").toLowerCase();
  return `${safeIp}::${safeEmail}`;
}

/** Provjeri da li je ključ trenutno blokiran. */
export function getLoginRateLimitState(
  ip: string | null,
  email: string | null,
): RateLimitState {
  const now = Date.now();
  maybeSweep(now);
  const key = makeKey(ip, email);
  const entry = store.get(key);
  if (!entry) return { blocked: false, retryAfterSec: 0, remaining: MAX_ATTEMPTS };
  if (entry.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000),
      remaining: 0,
    };
  }
  pruneOldAttempts(entry, now);
  const used = entry.attempts.length;
  return {
    blocked: false,
    retryAfterSec: 0,
    remaining: Math.max(0, MAX_ATTEMPTS - used),
  };
}

/** Registruje neuspjeli pokušaj i vraća novo stanje. */
export function registerLoginFailure(
  ip: string | null,
  email: string | null,
): RateLimitState {
  const now = Date.now();
  const key = makeKey(ip, email);
  let entry = store.get(key);
  if (!entry) {
    entry = { attempts: [], blockedUntil: 0 };
    store.set(key, entry);
  }
  pruneOldAttempts(entry, now);
  entry.attempts.push(now);
  if (entry.attempts.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
  }
  return getLoginRateLimitState(ip, email);
}

/** Uspješan login — briše brojač. */
export function clearLoginRateLimit(
  ip: string | null,
  email: string | null,
): void {
  store.delete(makeKey(ip, email));
}
