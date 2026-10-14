/**
 * npm run content:validate (TRD §5, FR-CMS-2). Parses every file in /content, validates it against its Zod schema,
 * then runs the cross-entry rules. Prints `content/events/foo.md › people[1].name: …` and exits 1 on any error.
 *   --verbose   list every "page not built yet" warning instead of summarising them
 */
import fs from "node:fs";
import path from "node:path";
import { checkIntegrity } from "../src/content/integrity";
import { CONTENT_DIR } from "../src/content/root";
import { formatIssue, readContent, type ContentIssue } from "../src/content/loaders";
import { getKnownRoutes } from "../src/content/routes";
import { collectTodos } from "../src/content/todo";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT = CONTENT_DIR;
const PUBLIC = path.join(ROOT, "public");
const verbose = process.argv.includes("--verbose");

const { content, issues: loadIssues } = readContent({ root: CONTENT, includeDrafts: true });

const messages = JSON.parse(
  fs.readFileSync(path.join(ROOT, "messages", "en.json"), "utf8"),
) as unknown;
const icons = (
  (await import("lucide-react/dynamicIconImports.mjs")) as { default: Record<string, unknown> }
).default;

const integrityIssues = checkIntegrity(content, {
  now: new Date(),
  contentFileExists: (p) => fs.existsSync(path.join(CONTENT, p)),
  publicFileExists: (p) => fs.existsSync(path.join(PUBLIC, p)),
  messages,
  knownRoutes: getKnownRoutes({ root: ROOT, content }),
  iconExists: (name) => name in icons,
});

const all: ContentIssue[] = [...loadIssues, ...integrityIssues];
const errors = all.filter((i) => i.severity === "error");
const warnings = all.filter((i) => i.severity === "warning");
const unbuilt = warnings.filter((w) => w.message.includes("is not built yet"));
const otherWarnings = warnings.filter((w) => !unbuilt.includes(w));

for (const issue of errors) console.error(`✖ ${formatIssue(issue)}`);
for (const issue of otherWarnings) console.warn(`⚠ ${formatIssue(issue)}`);
if (verbose) for (const issue of unbuilt) console.warn(`⚠ ${formatIssue(issue)}`);

const entryCount =
  Object.values(content.collections).reduce((n, list) => n + list.length, 0) +
  Object.keys(content.singletons).length;
const todoCount = [
  ...Object.values(content.collections).flat(),
  ...Object.values(content.singletons),
].reduce((n, loaded) => n + (loaded ? collectTodos(loaded.data).length : 0), 0);

console.log("");
console.log(`Checked ${entryCount} content entries.`);
if (unbuilt.length > 0 && !verbose) {
  console.log(
    `⚠ ${unbuilt.length} links point to pages that are not built yet (npm run content:validate -- --verbose to list them).`,
  );
}
console.log(`${todoCount} TODO_CONFIRM placeholders (npm run todo:confirm lists them).`);
console.log(
  errors.length === 0
    ? `✔ Content is valid (${otherWarnings.length} other warning${otherWarnings.length === 1 ? "" : "s"}).`
    : `✖ ${errors.length} error${errors.length === 1 ? "" : "s"}.`,
);
process.exit(errors.length === 0 ? 0 : 1);
