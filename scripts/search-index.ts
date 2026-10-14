/**
 * npm run search-index (TRD §8.3, BACKEND_SCHEMA §7). Writes public/search-index.json for the command palette: pages,
 * startups, events, open calls, news, documents, instruments and people. Pages that do not exist yet are left out;
 * `--all` keeps them (development and previews). Part of `prebuild` and `predev`.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { getKnownRoutes } from "../src/content/routes";
import { buildSearchDocs, type PageLink } from "../src/content/search-docs";
import type { SearchIndexFile } from "../src/lib/search";

const ROOT = path.resolve(import.meta.dirname, "..");
const includeUnbuilt = process.argv.includes("--all") || process.env.NEXT_PUBLIC_SHOW_TODOS === "1";
const BUDGET_GZ = 60 * 1024;

const { content, issues } = readContent({ root: CONTENT_DIR, includeDrafts: false });
const errors = issues.filter((i) => i.severity === "error");
if (errors.length > 0) {
  console.error(`✖ Content has ${errors.length} error(s); run npm run content:validate.`);
  process.exit(1);
}

const nav = content.singletons.navigation?.data;
const site = content.singletons.site?.data;
const pageLinks: PageLink[] = [
  ...(nav?.primary.flatMap((item) => [
    ...(item.href ? [{ label: item.label, href: item.href }] : []),
    ...(item.groups?.flatMap((g) => g.links) ?? []),
  ]) ?? []),
  ...(nav ? [nav.cta] : []),
  ...(site?.footerGroups.flatMap((g) => g.links).filter((l) => l.href.startsWith("/")) ?? []),
];

const docs = buildSearchDocs(content, {
  now: new Date(),
  routes: getKnownRoutes({ root: ROOT, content }),
  showUnbuilt: includeUnbuilt,
  pageLinks,
  fileSizeKB: (file) => {
    const target = path.join(ROOT, "public", file);
    return fs.existsSync(target)
      ? Math.max(1, Math.round(fs.statSync(target).size / 1024))
      : undefined;
  },
});

const file: SearchIndexFile = { v: 1, docs };
const json = JSON.stringify(file);
const target = path.join(ROOT, "public", "search-index.json");
fs.writeFileSync(target, json, "utf8");

const gz = zlib.gzipSync(json).length;
console.log(
  `Search index: ${docs.length} documents, ${(gz / 1024).toFixed(1)} KB gzipped${includeUnbuilt ? " (including unbuilt pages)" : ""}.`,
);
if (gz > BUDGET_GZ) {
  console.error(`✖ Over the ${BUDGET_GZ / 1024} KB gzipped budget (TRD §8.3).`);
  process.exit(1);
}
