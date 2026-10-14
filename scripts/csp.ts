/**
 * npm run csp (TRD §14): after `next build`, puts a Content-Security-Policy in the `<head>` of every page in out/, with the
 * hash of each of that page's inline scripts (see src/lib/security.ts for why it is per page). Run by `postbuild`, after the
 * redirect stubs are written. The policy also allows what the build is configured to talk to: the form endpoint
 * (NEXT_PUBLIC_FORM_ENDPOINT), the map (the site's mapEmbedUrl or NEXT_PUBLIC_MAP_EMBED_URL) and the analytics provider.
 *
 * The CMS at /admin/ is left alone: it is a separate application that loads its own scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { buildAnalytics } from "../src/lib/analytics";
import {
  buildPolicy,
  endpointOrigins,
  inlineScriptHashes,
  injectPolicy,
  originOf,
} from "../src/lib/security";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
if (!fs.existsSync(OUT)) {
  console.error("✖ out/ does not exist. Run `next build` first.");
  process.exit(1);
}

const { content } = readContent({ root: CONTENT_DIR, includeDrafts: false });
const analytics = buildAnalytics();
const form = endpointOrigins(process.env.NEXT_PUBLIC_FORM_ENDPOINT);
const maps = [
  originOf(content.singletons.site?.data.mapEmbedUrl),
  originOf(process.env.NEXT_PUBLIC_MAP_EMBED_URL),
];

const common = {
  connectOrigins: [...form, ...(analytics ? [analytics.origin] : [])],
  frameOrigins: maps.filter((o): o is string => o !== undefined),
  formOrigins: form,
  scriptOrigins: analytics ? [analytics.origin] : [],
};

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next" || (dir === OUT && entry.name === "admin")) continue;
      walk(full, found);
    } else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

let changed = 0;
let stubs = 0;
for (const file of walk(OUT)) {
  const html = fs.readFileSync(file, "utf8");
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(html)) {
    stubs += 1; // a redirect stub has no scripts, and its policy would only be the floor
    continue;
  }
  const policy = buildPolicy({ scriptHashes: inlineScriptHashes(html), ...common });
  fs.writeFileSync(file, injectPolicy(html, policy), "utf8");
  changed += 1;
}
console.log(
  `CSP: a policy written into ${changed} pages (${stubs} redirect stubs left as they are).`,
);
if (analytics) console.log(`CSP: analytics from ${analytics.origin} allowed.`);
