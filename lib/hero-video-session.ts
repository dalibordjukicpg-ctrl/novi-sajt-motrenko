/** Jednom po sesiji — hero video ne smije ponovo pokazati poster / prvi frejm. */
let moduleReady = false;
let savedTimeSec = 0;

export function getHomeHeroVideoReady(): boolean {
  if (moduleReady) return true;
  if (typeof window === "undefined") return false;
  try {
    moduleReady = sessionStorage.getItem("hrc-hero-video-ready") === "1";
    const t = sessionStorage.getItem("hrc-hero-video-time");
    if (t) savedTimeSec = Number.parseFloat(t) || 0;
  } catch {
    moduleReady = false;
  }
  return moduleReady;
}

export function getSavedHeroVideoTime(): number {
  if (savedTimeSec > 0) return savedTimeSec;
  if (typeof window === "undefined") return 0;
  try {
    const t = sessionStorage.getItem("hrc-hero-video-time");
    return t ? Number.parseFloat(t) || 0 : 0;
  } catch {
    return 0;
  }
}

export function persistHeroVideoProgress(currentTime: number): void {
  if (!Number.isFinite(currentTime) || currentTime <= 0) return;
  savedTimeSec = currentTime;
  moduleReady = true;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("hrc-hero-video-ready", "1");
    sessionStorage.setItem("hrc-hero-video-time", String(currentTime));
  } catch {
    /* private mode / quota */
  }
}

export function setHomeHeroVideoReady(): void {
  persistHeroVideoProgress(getSavedHeroVideoTime() || 0.1);
}
