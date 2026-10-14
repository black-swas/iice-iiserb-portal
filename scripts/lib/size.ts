/**
 * First-load weight of a built page (TRD §12): the scripts the browser runs before the page is usable, the stylesheets,
 * the fonts, and any request to another site. Pure, so tests/unit/size.test.ts can feed it strings; scripts/size.ts reads out/.
 * "Initial JS" counts what the HTML loads with `<script src>` and a module preload. Scripts marked `nomodule` are polyfills
 * for browsers too old to run the rest of the site, so a modern browser never fetches them and they are left out.
 */

/** Gzipped kilobytes, the unit the budgets are written in (1 KB = 1024 bytes). */
export const KB = 1024;

export interface Budgets {
  /** Initial JS, gzipped, for the home page. */
  homeJs: number;
  /** Initial JS, gzipped, for every other page. */
  pageJs: number;
  /** Stylesheets, gzipped. */
  css: number;
  /** Font files, total. */
  fontBytes: number;
  fontFiles: number;
}

/**
 * TRD §12. The JS ceilings were raised by 300 KB on 2026-10-14 (130 → 430 and 100 → 400): React and the Next.js runtime are
 * about 120 KB gzipped on their own. They guard against growth; Lighthouse is the real performance gate.
 */
export const BUDGETS: Budgets = {
  homeJs: 430 * KB,
  pageJs: 400 * KB,
  css: 35 * KB,
  fontBytes: 120 * KB,
  fontFiles: 4,
};

export interface Assets {
  /** Site-relative paths of scripts loaded on first view, without duplicates (scripts first, then preloads). */
  scripts: string[];
  styles: string[];
  fonts: string[];
  /** Hosts other than the site's own that the HTML asks the browser to load things from. */
  thirdParty: string[];
}

const attr = (tag: string, name: string) =>
  new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i")
    .exec(tag)
    ?.slice(1)
    .find((v) => v !== undefined);

/** The assets a page's HTML loads before it is interactive. */
export function firstLoadAssets(html: string, siteHost: string): Assets {
  const scripts = new Set<string>();
  const styles = new Set<string>();
  const fonts = new Set<string>();
  const foreign = new Set<string>();

  const note = (url: string | undefined) => {
    if (!url || url.startsWith("data:") || url.startsWith("#")) return;
    if (/^(https?:)?\/\//i.test(url)) {
      const host = new URL(url, "https://placeholder.invalid").hostname;
      if (host !== siteHost) foreign.add(host);
    }
  };

  for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
    const src = attr(tag, "src");
    note(src);
    if (src && !/\snomodule(?=[\s=>])/i.test(tag) && !/^(https?:)?\/\//i.test(src))
      scripts.add(src);
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const href = attr(tag, "href");
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const as = (attr(tag, "as") ?? "").toLowerCase();
    // A `preconnect` or `dns-prefetch` to another host is a first-load request in spirit, so it is noted too.
    if (/stylesheet|preload|icon|preconnect|dns-prefetch|modulepreload/.test(rel)) note(href);
    if (!href || /^(https?:)?\/\//i.test(href)) continue;
    if (rel === "stylesheet") styles.add(href);
    else if (rel === "modulepreload" || (rel === "preload" && as === "script")) {
      // Preloaded scripts are fetched whether or not a `<script>` follows, so they count once with the others.
      if (!/\snomodule(?=[\s=>])/i.test(tag)) scripts.add(href);
    } else if (rel === "preload" && as === "font") fonts.add(href);
  }
  for (const [, url] of html.matchAll(/url\(\s*["']?([^"')]+\.(?:woff2?|ttf|otf))/gi))
    fonts.add(url as string);
  return {
    scripts: [...scripts],
    styles: [...styles],
    fonts: [...fonts],
    thirdParty: [...foreign],
  };
}

export interface Measured {
  route: string;
  jsBytes: number;
  cssBytes: number;
  fontBytes: number;
  fontFiles: number;
  thirdParty: string[];
}

export interface Breach {
  route: string;
  rule: string;
  actual: number;
  limit: number;
}

export const isHome = (route: string) => route === "/";

/** Every budget a page breaks. */
export function breaches(m: Measured, budgets: Budgets = BUDGETS): Breach[] {
  const out: Breach[] = [];
  const jsLimit = isHome(m.route) ? budgets.homeJs : budgets.pageJs;
  if (m.jsBytes > jsLimit)
    out.push({ route: m.route, rule: "initial JS (gzip)", actual: m.jsBytes, limit: jsLimit });
  if (m.cssBytes > budgets.css)
    out.push({ route: m.route, rule: "CSS (gzip)", actual: m.cssBytes, limit: budgets.css });
  if (m.fontBytes > budgets.fontBytes)
    out.push({
      route: m.route,
      rule: "fonts (bytes)",
      actual: m.fontBytes,
      limit: budgets.fontBytes,
    });
  if (m.fontFiles > budgets.fontFiles)
    out.push({ route: m.route, rule: "font files", actual: m.fontFiles, limit: budgets.fontFiles });
  return out;
}

export const kb = (bytes: number) => `${(bytes / KB).toFixed(1)} KB`;
