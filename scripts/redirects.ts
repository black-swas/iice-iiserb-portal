/**
 * npm run redirects            writes public/.htaccess, public/_redirects and public/_headers, deploy/nginx-redirects.conf
 *                                and vercel.json (the only one that is committed)
 * npm run redirects -- --stubs   after `next build`: writes an HTML stub into out/ at each old path, for hosts that
 *                                can do no redirects at all (TRD §15.2). Run by `postbuild`.
 *
 * Only redirects whose target page exists are written: a redirect to a missing page would swap one 404 for another.
 */
import fs from "node:fs";
import path from "node:path";
import { activeRedirects, targetRoute } from "../src/content/redirects";
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { getKnownRoutes } from "../src/content/routes";
import {
  headersFile,
  htaccess,
  nginx,
  redirectsFile,
  stubHtml,
  vercelConfig,
} from "../src/lib/redirects";
import { SITE_URL } from "../src/lib/seo";
import { isBuilt } from "../src/lib/nav";

const ROOT = path.resolve(import.meta.dirname, "..");
const { content } = readContent({ root: CONTENT_DIR, includeDrafts: false });
const routes = getKnownRoutes({ root: ROOT, content });
const events = content.collections.events.map((e) => ({
  slug: e.data.slug,
  legacyPath: e.data.legacyPath,
}));
const { active, skipped } = activeRedirects(events, (route) => isBuilt(route, routes));

for (const r of skipped) {
  console.warn(`⚠ Redirect ${r.from} → ${r.to} skipped: ${targetRoute(r.to)} is not built.`);
}

if (process.argv.includes("--stubs")) {
  const out = path.join(ROOT, "out");
  if (!fs.existsSync(out)) {
    console.error("✖ out/ does not exist. Run `next build` first.");
    process.exit(1);
  }
  let written = 0;
  for (const redirect of active) {
    const dir = path.join(out, ...redirect.from.split("/").filter(Boolean));
    // Never overwrite a real page: a redirect source that is also a built route (e.g. /startups) is already served.
    if (fs.existsSync(path.join(dir, "index.html"))) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "index.html"),
      stubHtml(redirect, { url: SITE_URL, name: "IICE, IISER Bhopal" }),
      "utf8",
    );
    written += 1;
  }
  console.log(
    `Redirect stubs: ${written} written into out/ (${active.length - written} already served by a real page).`,
  );
} else {
  const files: [string, string][] = [
    [path.join(ROOT, "public", ".htaccess"), htaccess(active)],
    [path.join(ROOT, "public", "_redirects"), redirectsFile(active)],
    [path.join(ROOT, "public", "_headers"), headersFile()],
    [path.join(ROOT, "deploy", "nginx-redirects.conf"), nginx(active)],
    // Committed, not ignored: Vercel reads it from the repository before it builds (docs/DEPLOY.md).
    [path.join(ROOT, "vercel.json"), `${JSON.stringify(vercelConfig(active), null, 2)}\n`],
  ];
  for (const [file, body] of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, "utf8");
  }
  console.log(
    `Redirects: ${active.length} written (${skipped.length} skipped) to public/.htaccess, public/_redirects, deploy/nginx-redirects.conf and vercel.json, with security headers in each (and public/_headers).`,
  );
}
