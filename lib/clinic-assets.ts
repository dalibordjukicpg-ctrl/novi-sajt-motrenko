/** Lokalni pun markeng logo (PNG sa ikonom + tekstom); CMS `logoMediaId` ga nadjačava. */
export const DEFAULT_HEADER_LOGO = "/logo-hrc-budva.png";

/** Rezolucija logotipa u headeru (za stabilan layout sa `next/image`). */
export const HEADER_LOGO_PIXEL_WIDTH = 522;
export const HEADER_LOGO_PIXEL_HEIGHT = 343;

/** Pozadina hero bloka na unutrašnjim stranicama (panorama recepcije). */
export const CLINIC_PAGE_HERO_BG = "/page-hero-panorama.png";

export const STORY_IMAGES = [
  "/wp-media/63f6680aaa47_centar-za-humanu-reprodukciju-budva-1000-beba-dr-tatjana-motrenko-simic-humanreproduction.jpg",
  "/wp-media/345dd5202c8f_centar-za-humanu-reprodukciju-budva-1000-beba-humanreproduction.jpg",
  "/wp-media/b5a30bb9f368_DAN-3-3.jpg",
  "/wp-media/e2596d1962b1_centar-za-humanu-reprodukciju-budva-1000-beba-u-publici-humanreproduction.jpg",
] as const;

/**
 * Portret dr Tatjane Motrenko Simić (javna fotografija iz wp-media).
 * Admin → Podešavanja: tim slotovi mogu zamijeniti URL.
 */
export const DR_MOTRENKO_PORTRAIT =
  "/wp-media/63f6680aaa47_centar-za-humanu-reprodukciju-budva-1000-beba-dr-tatjana-motrenko-simic-humanreproduction.jpg";

/** Blok „Upoznajte tim“: fallback kad CMS nema glavnog portreta (`team_m1_media_id`). */
export const TEAM_HOME_PORTRAIT_FALLBACKS = [
  DR_MOTRENKO_PORTRAIT,
  DR_MOTRENKO_PORTRAIT,
  DR_MOTRENKO_PORTRAIT,
  DR_MOTRENKO_PORTRAIT,
] as const;

/** Pozadine stat kartica na početnoj — po smislu statistike (ne isti portret 4×). */
export const STAT_BG_IMAGES = [
  /** Zadovoljstvo pacijenata — porodica / uspješan ishod */
  "/wp-media/fc237af89e3e_centar-za-humanu-reprodukciju-budva-1000-beba-sa-roditeljima-humanreproduction.jpg",
  /** Rođena djeca — proslava / bebe */
  "/wp-media/5fab1903d14c_centar-za-humanu-reprodukciju-budva-1000-beba-deca-humanreproduction.jpg",
  /** Tretirani pacijenti — klinika / recepcija */
  "/page-hero-panorama.png",
  /** Multidisciplinarni tim — konferencija / medicinska tema */
  "/wp-media/8285bece6c67_centar-za-humanu-reprodukciju-budva-eshre-pariz-2025-humanreproduction.jpg",
] as const;
