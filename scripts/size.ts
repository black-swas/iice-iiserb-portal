/**
 * npm run size (TRD §12): measures the first-load JS, CSS and fonts of every built page in out/ and fails if a budget is
 * broken, or if any page asks another site for something on first load. Run it after `npm run build`.
 *   --chunks   also list the shared chunks, largest first, with their gzipped size
 *   --all      print every page, not just the templates TRD §12 audits and the worst one
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { SITE_URL } from "../src/lib/seo";
import { BUDGETS, breaches, firstLoadAssets, isHome, kb, type Measured } from "./lib/size";
import { auditedTemplates } from "./lib/templates";

const OUT = path.resolve(import.meta.dirname, "..", "out");
if (!fs.existsSync(OUT)) {
  console.error("✖ out/ does not exist. Run `npm run build` first.");
  process.exit(1);
}

const gzipped = new Map<string, number>();
function gzSize(urlPath: string): number {
  const cached = gzipped.get(urlPath);
  if (cached !== undefined) return cached;
  const file = path.join(
    OUT,
    decodeURIComponent(urlPath.split(/[?#]/)[0] as string).replace(/^\//, ""),
  );
  const size = fs.existsSync(file) ? zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length : 0;
  gzipped.set(urlPath, size);
  return size;
}
const rawSize = (urlPath: string) => {
  const file = path.join(OUT, urlPath.replace(/^\//, ""));
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
};

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next" || entry.name === "admin") continue;
      walk(full, found);
    } else if (entry.name === "index.html") found.push(full);
  }
  return found;
}

const siteHost = new URL(SITE_URL).hostname;
const measured: Measured[] = [];
for (const file of walk(OUT)) {
  const rel = path.relative(OUT, path.dirname(file)).split(path.sep).join("/");
  const route = rel ? `/${rel}/` : "/";
  const html = fs.readFileSync(file, "utf8");
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(html)) continue; // a redirect stub
  if (route === "/404/" || route === "/_not-found/") continue;
  const assets = firstLoadAssets(html, siteHost);
  const fontBytes = assets.fonts.reduce((n, f) => n + rawSize(f), 0);
  measured.push({
    route,
    jsBytes: assets.scripts.reduce((n, s) => n + gzSize(s), 0),
    cssBytes: assets.styles.reduce((n, s) => n + gzSize(s), 0),
    fontBytes,
    fontFiles: assets.fonts.length,
    thirdParty: assets.thirdParty,
  });
}
measured.sort((a, b) => a.route.localeCompare(b.route));

const templates = new Set(auditedTemplates(measured.map((m) => m.route)));
const worst = measured.filter((m) => !isHome(m.route)).sort((a, b) => b.jsBytes - a.jsBytes)[0];
const shown = process.argv.includes("--all")
  ? measured
  : measured.filter((m) => templates.has(m.route) || m === worst);

const pad = (text: string, width: number) => text.padEnd(width);
console.log(`${pad("page", 36)}${pad("JS (gz)", 12)}${pad("CSS (gz)", 12)}${pad("headroom", 12)}`);
for (const m of shown) {
  const limit = isHome(m.route) ? BUDGETS.homeJs : BUDGETS.pageJs;
  console.log(
    `${pad(m.route, 36)}${pad(kb(m.jsBytes), 12)}${pad(kb(m.cssBytes), 12)}${pad(kb(limit - m.jsBytes), 12)}`,
  );
}
console.log(
  `\n${measured.length} pages measured. Budgets: home ${kb(BUDGETS.homeJs)}, other pages ${kb(BUDGETS.pageJs)}, CSS ${kb(BUDGETS.css)}.`,
);

if (process.argv.includes("--chunks")) {
  const html = fs.readFileSync(path.join(OUT, "about", "index.html"), "utf8");
  const chunks = firstLoadAssets(html, siteHost).scripts.map((s) => ({
    s,
    gz: gzSize(s),
    raw: rawSize(s),
  }));
  console.log("\nShared chunks on /about/, largest first:");
  for (const c of chunks.sort((a, b) => b.gz - a.gz))
    console.log(`  ${pad(kb(c.gz), 10)} gz  ${pad(kb(c.raw), 10)} raw  ${c.s}`);
}

const problems = measured.flatMap((m) => breaches(m));
const foreign = measured.filter((m) => m.thirdParty.length > 0);
for (const b of problems)
  console.error(`✖ ${b.route} › ${b.rule}: ${kb(b.actual)} is over the ${kb(b.limit)} budget`);
for (const m of foreign)
  console.error(`✖ ${m.route} › first load asks another site: ${m.thirdParty.join(", ")}`);
if (problems.length > 0 || foreign.length > 0) process.exit(1);
console.log("✔ Every page is within budget, and nothing on first load comes from another site.");
