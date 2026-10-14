/**
 * npm run audit:html (TRD §13.3): parses every page in out/ and fails with `file › selector › rule` on the anti-patterns
 * seen on the reference sites. Run it after `npm run build`. A preview build (NEXT_PUBLIC_SHOW_TODOS=1) may carry TODO
 * markers on purpose; pass --allow-todo to audit one.
 */
import fs from "node:fs";
import path from "node:path";
import { auditCss, auditHtml, type AuditPage } from "./lib/audit-html";
import { SITE_URL } from "../src/lib/seo";

const OUT = path.resolve(import.meta.dirname, "..", "out");
if (!fs.existsSync(OUT)) {
  console.error("✖ out/ does not exist. Run `npm run build` first.");
  process.exit(1);
}

/** Next writes the 404 page three times (404.html, 404/ and _not-found/); only one is audited, the rest are copies. */
const COPIES = new Set(["404/index.html", "_not-found/index.html"]);

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

const files = walk(OUT).map((f) => path.relative(OUT, f).split(path.sep).join("/"));
const pages: AuditPage[] = files
  .filter((f) => f.endsWith(".html") && !COPIES.has(f) && !f.startsWith("admin/"))
  .map((f) => ({ file: f, html: fs.readFileSync(path.join(OUT, f), "utf8") }));

const present = new Set(files);
const pathExists = (urlPath: string) => {
  const clean = decodeURIComponent(urlPath.replace(/^\//, ""));
  return (
    present.has(clean) ||
    present.has(`${clean.replace(/\/$/, "")}/index.html`) ||
    present.has(`${clean.replace(/\/$/, "")}.html`)
  );
};

const findings = [
  ...auditHtml(pages, {
    siteHost: new URL(SITE_URL).hostname,
    pathExists,
    allowTodo: process.argv.includes("--allow-todo"),
  }),
  ...files
    .filter((f) => f.endsWith(".css"))
    .flatMap((f) => auditCss(f, fs.readFileSync(path.join(OUT, f), "utf8"))),
];

for (const f of findings) console.error(`✖ ${f.file} › ${f.selector} › ${f.rule}`);
if (findings.length > 0) {
  console.error(
    `\n${findings.length} finding${findings.length === 1 ? "" : "s"} in ${pages.length} pages.`,
  );
  process.exit(1);
}
console.log(`✔ ${pages.length} pages pass the HTML audit.`);
