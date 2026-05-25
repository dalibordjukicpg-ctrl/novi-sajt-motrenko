import type { Redirect } from "next/dist/lib/load-custom-routes";

/** 301 permanent redirect (Next.js `permanent: true` daje 308). */
function permanent301(source: string, destination: string): Redirect {
  return { source, destination, statusCode: 301 };
}

/**
 * Slugovi WP stranica iz starog menija (humanreproduction.com).
 * Nova ruta: `/[locale]/s/[slug]` — npr. `/me/s/opsti-podaci`.
 */
export const LEGACY_WP_PAGE_SLUGS = [
  "opsti-podaci",
  "tim",
  "aktivnosti-centra",
  "ustanove-sa-kojima-saradujemo",
  "edukacija-i-naucno-istrazivacki-rad",
  "fertilnost-ljudske-rase",
  "kada-se-javiti",
  "uzroci-infertiliteta",
  "dijagnosticke-metode-muskarac",
  "dijagnosticke-metode-zena",
  "psiholoska-podrska",
  "stimulacija-ovulacije",
  "iui",
  "ivf",
  "kultivacija-embriona-gajenje-embriona",
  "krioprezervacija-embriona-zamrzavanje-embriona-vitrifikacija-embriona",
  "donacija-oocita",
  "donacije-sperme",
  "donacije-embriona",
  "dodatne-tehnike",
  "pregledi",
  "ginekoloske-intervencije-i-operacije",
  "redovni-pregledi-trudnoce",
  "spontani-pobacaj",
  "prevremeni-porodjaj",
  "patoloska-stanja-u-trudnoci",
  "prezervacija-fertilnosti-muskarci",
  "prezervacija-fertilnosti-zene",
  "deca-pre-puberteta",
  "kontakt",
  "o-nama",
  "naslovna",
] as const;

/** Podrazumijevani locale — ne uvoziti `@/lib/i18n` (next.config se učitava bez TS path aliasa). */
const LOCALE = "me";

const LEGACY_WP_SLUG_SET = new Set<string>(LEGACY_WP_PAGE_SLUGS);

const LEGACY_BLOG_INDEX_PATHS = new Set([
  "/blog",
  "/novosti",
  "/category/novosti",
  "/./novosti",
]);

/** Stare WP alias putanje → nova lokacija. */
const LEGACY_PATH_ALIASES: Record<string, string> = {
  osoblje: `/${LOCALE}/s/tim`,
  "nas-tim": `/${LOCALE}/s/tim`,
};

/** Root segmenti koji nisu WP stranice/objave — ne redirectuj na /posts/. */
const RESERVED_ROOT_SEGMENTS = new Set([
  "me",
  "en",
  "ru",
  "api",
  "admin",
  "posts",
  "s",
  "uploads",
  "wp-content",
  "wp-includes",
  "wp-json",
  "xmlrpc.php",
  "feed",
  "blog",
  "novosti",
  "category",
  "index.php",
  "hrc-panel-74x",
  "_next",
]);

/**
 * Tim profili + blog objave indeksirani na root-u (humanreproduction.com/slug/).
 * Eksplicitna lista za next.config; middleware koristi i opšti fallback.
 */
export const LEGACY_WP_POST_SLUGS = [
  "aleksandra-obradovic-medicinska-sestra-tehnicar",
  "boris-kojicic",
  "dr-ana-bogdanovic",
  "jelena-popovic-klinicki-embriolog",
  "dr-marija-petricevic",
  "dr-milenko-tadic",
  "jasna-mijanovic-embriolog",
  "maja-scekic-visa-med-sestra-koordinator-za-ivf",
  "marina-colic-medicinski-tehnicar-sestra",
  "milena-radulovic-visa-med-sestra-glavna-sestra",
  "mr-sci-dr-tatjana-motrenko-simic",
  "sasa-lozo",
  "centar-za-humanu-reprodukciju-proslavio-1-000-rodjenih-beba-za-deset-godina-postojanja",
  "dr-tatjana-motrenko-simic-oficir-za-vezu-i-relacije-eshre-a-sa-uems-i-ebcog",
  "dr-tatjana-motrenko-simic-odlikovana-ordenom-rada-za-rezultate-pokazane-u-oblasti-reproduktivne-medicine",
  "art-registri-u-svetu-milano",
] as const;

const LEGACY_WP_POST_SLUG_SET = new Set<string>(LEGACY_WP_POST_SLUGS);

/**
 * Middleware / edge — 301 prije App Routera (radi pouzdano i u `next dev`).
 * Vraća putanju (može sadržati `#fragment`), ili null.
 */
export function resolveLegacyWordPressRedirect(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const home = `/${LOCALE}`;

  if (LEGACY_BLOG_INDEX_PATHS.has(path)) return `${home}#novosti`;

  if (path === "/category/osoblje") return `/${LOCALE}/s/tim`;

  const novostiPost = path.match(/^\/novosti\/([^/]+)$/);
  if (novostiPost?.[1]) {
    return `/${LOCALE}/posts/${encodeURIComponent(novostiPost[1])}`;
  }

  const legacyPost = path.match(/^\/posts\/([^/]+)$/);
  if (legacyPost?.[1]) {
    return `/${LOCALE}/posts/${encodeURIComponent(legacyPost[1])}`;
  }

  const shortCms = path.match(/^\/s\/([^/]+)$/);
  if (shortCms?.[1]) {
    return `/${LOCALE}/s/${encodeURIComponent(shortCms[1])}`;
  }

  const rootSlug = path.match(/^\/([^/]+)$/);
  if (rootSlug?.[1]) {
    const seg = rootSlug[1];
    if (LEGACY_WP_SLUG_SET.has(seg)) {
      return `/${LOCALE}/s/${encodeURIComponent(seg)}`;
    }
    const alias = LEGACY_PATH_ALIASES[seg];
    if (alias) return alias;
    if (
      !RESERVED_ROOT_SEGMENTS.has(seg) &&
      (LEGACY_WP_POST_SLUG_SET.has(seg) || /^[a-z0-9][a-z0-9-]*$/i.test(seg))
    ) {
      return `/${LOCALE}/posts/${encodeURIComponent(seg)}`;
    }
  }

  if (path === "/index.php" || path.startsWith("/index.php/")) return home;
  if (path === "/feed" || path.startsWith("/feed/")) return home;
  if (path === "/comments/feed") return home;
  if (path.startsWith("/wp-json/")) return home;
  if (path === "/xmlrpc.php") return home;

  return null;
}

export function buildLegacyWordPressRedirects(): Redirect[] {
  const redirects: Redirect[] = [];
  const home = `/${LOCALE}`;

  // Blog / novosti (WP kategorija) → sekcija na početnoj
  for (const src of ["/blog", "/novosti", "/category/novosti", "/./novosti"]) {
    redirects.push(permanent301(src, `${home}#novosti`));
  }

  redirects.push(
    permanent301("/category/osoblje", `/${LOCALE}/s/tim`),
    permanent301("/osoblje", `/${LOCALE}/s/tim`),
    permanent301("/nas-tim", `/${LOCALE}/s/tim`),
  );

  // WP članci bili na /novosti/slug; novi sajt: /me/posts/slug
  redirects.push(
    permanent301("/novosti/:slug", `/${LOCALE}/posts/:slug`),
    permanent301("/posts/:slug", `/${LOCALE}/posts/:slug`),
  );

  // Kratki CMS prefiks bez locale-a
  redirects.push(permanent301("/s/:slug", `/${LOCALE}/s/:slug`));

  // Stare WP stranice na root-u → /me/s/slug
  for (const slug of LEGACY_WP_PAGE_SLUGS) {
    redirects.push(permanent301(`/${slug}`, `/${LOCALE}/s/${slug}`));
  }

  // Tim profili + blog objave indeksirani na root-u → /me/posts/slug
  for (const slug of LEGACY_WP_POST_SLUGS) {
    redirects.push(permanent301(`/${slug}`, `/${LOCALE}/posts/${slug}`));
  }

  // WordPress sistemski URL-ovi
  redirects.push(
    permanent301("/index.php", home),
    permanent301("/index.php/:path*", home),
    permanent301("/feed", home),
    permanent301("/feed/:path*", home),
    permanent301("/comments/feed", home),
    permanent301("/wp-json/:path*", home),
    permanent301("/xmlrpc.php", home),
  );

  return redirects;
}
