/**
 * npm run lhci (TRD §12, §13.1): Lighthouse CI on the built site. It audits the templates in scripts/lib/templates.ts, on the
 * mobile profile, against the assertions in lighthouserc.json. Run it after `npm run build`.
 *
 * Canonical and Open Graph URLs point at NEXT_PUBLIC_SITE_URL, and Lighthouse requires a canonical on the page's own origin to
 * pass, so build with `NEXT_PUBLIC_SITE_URL=http://localhost:4175` for this check (CI does; the deployed site uses the real
 * address). Chrome comes from Playwright's own install, so there is nothing else to set up: `npx playwright install chromium`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { auditedTemplates } from "./lib/templates";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const PORT = 4175;

const sitemap = path.join(OUT, "sitemap.xml");
if (!fs.existsSync(sitemap)) {
  console.error("✖ out/ does not exist. Run `npm run build` first.");
  process.exit(1);
}
const routes = [
  ...fs.readFileSync(sitemap, "utf8").matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g),
].map((m) => m[1] as string);
// `npm run lhci -- --collect.url=http://localhost:4175/about/` audits just that page instead of the templates.
const explicit = process.argv.slice(2).some((arg) => arg.startsWith("--collect.url"));
const urls = explicit
  ? []
  : auditedTemplates(routes).map((route) => `http://localhost:${PORT}${route}`);

const chrome = chromium.executablePath();
if (!fs.existsSync(chrome)) {
  console.error("✖ Chromium is not installed. Run `npx playwright install chromium`.");
  process.exit(1);
}

const windows = process.platform === "win32";
console.log(
  `Lighthouse CI: ${explicit ? "the pages given" : `${urls.length} pages`}, mobile profile.`,
);
const result = spawnSync(
  windows ? "npx.cmd" : "npx",
  [
    "lhci",
    "autorun",
    "--config=lighthouserc.json",
    ...urls.map((url) => `--collect.url=${url}`),
    ...process.argv.slice(2),
  ],
  { cwd: ROOT, stdio: "inherit", shell: windows, env: { ...process.env, CHROME_PATH: chrome } },
);
printScores(path.join(ROOT, ".lighthouseci"));
process.exit(result.status ?? 1);

/** One line per audited page: the four category scores (0-100) and the three timings the budgets name. */
function printScores(directory: string) {
  if (!fs.existsSync(directory)) return;
  interface Report {
    finalDisplayedUrl?: string;
    requestedUrl: string;
    categories: Record<string, { score: number | null }>;
    audits: Record<string, { numericValue?: number }>;
  }
  const rows = fs
    .readdirSync(directory)
    .filter((f) => /^lhr-.*\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(directory, f), "utf8")) as Report)
    .map((r) => {
      const score = (id: string) =>
        String(Math.round((r.categories[id]?.score ?? 0) * 100)).padStart(3);
      const ms = (id: string) => String(Math.round(r.audits[id]?.numericValue ?? 0)).padStart(5);
      return {
        url: new URL(r.finalDisplayedUrl ?? r.requestedUrl).pathname,
        text: `perf ${score("performance")}  a11y ${score("accessibility")}  bp ${score("best-practices")}  seo ${score("seo")}  LCP ${ms("largest-contentful-paint")} ms  TBT ${ms("total-blocking-time")} ms  CLS ${(r.audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)}`,
      };
    })
    .sort((a, b) => a.url.localeCompare(b.url));
  console.log("\nLighthouse mobile scores (last run of each page):");
  const width = Math.max(...rows.map((r) => r.url.length), 4);
  for (const row of rows) console.log(`  ${row.url.padEnd(width)}  ${row.text}`);
}
