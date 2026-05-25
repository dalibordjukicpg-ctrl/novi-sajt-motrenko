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

/**
 * Middleware / edge — 301 prije App Routera (radi pouzdano i u `next dev`).
 * Vraća putanju (može sadržati `#fragment`), ili null.
 */
export function resolveLegacyWordPressRedirect(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const home = `/${LOCALE}`;

  if (LEGACY_BLOG_INDEX_PATHS.has(path)) return `${home}#novosti`;

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
  if (rootSlug?.[1] && LEGACY_WP_SLUG_SET.has(rootSlug[1])) {
    return `/${LOCALE}/s/${encodeURIComponent(rootSlug[1])}`;
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
