/**
 * npm run check:launch (TRD §16, CLAUDE.md rule 1): the gate before the site goes live. It fails while any placeholder is
 * still presented as fact, and it also runs the checks that must be clean at launch.
 *
 *   1. Builds the production site (out/), exactly as it would be deployed.
 *   2. Builds the same site again with NEXT_PUBLIC_KEEP_TODO=1 into .cache/launch, where every placeholder keeps its
 *      `TODO_CONFIRM` marker, and lists each page that would show one.
 *   3. Lists published entries flagged `_status: TODO_CONFIRM`.
 *   4. Runs the HTML audit (forbidden copy, markers in the page source, links, alt text…), the link check and the spell
 *      check on the production build.
 *
 * Until IICE has confirmed the content this is expected to fail: that is its job. `--report` prints the same lists and
 * exits 0. `--skip-build` reuses the builds already on disk.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { flaggedEntries, placeholdersIn, type Placeholder } from "./lib/launch";

const ROOT = path.resolve(import.meta.dirname, "..");
const LAUNCH_DIR = path.join(ROOT, ".cache", "launch");
const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const windows = process.platform === "win32";
const npm = windows ? "npm.cmd" : "npm";
const npx = windows ? "npx.cmd" : "npx";

function run(
  label: string,
  command: string,
  commandArgs: string[],
  env: Record<string, string> = {},
): boolean {
  console.log(`\n── ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: windows,
    env: { ...process.env, ...env },
  });
  return result.status === 0;
}

// The build under test must be a production one: no preview markers, and no marker-keeping unless asked for.
const clean = { NEXT_PUBLIC_SHOW_TODOS: "", NEXT_PUBLIC_KEEP_TODO: "" };

if (!args.includes("--skip-build")) {
  if (!run("Building the production site", npm, ["run", "build"], clean)) process.exit(1);
  fs.rmSync(LAUNCH_DIR, { recursive: true, force: true });
  // Not `npm run build`: its prebuild would regenerate public/ files (the search index) with the markers left in.
  if (
    !run("Building a copy that keeps placeholder markers", npx, ["next", "build"], {
      ...clean,
      NEXT_PUBLIC_KEEP_TODO: "1",
      NEXT_DIST_DIR: path.relative(ROOT, LAUNCH_DIR),
    })
  )
    process.exit(1);
}

function pages(dir: string): { route: string; html: string }[] {
  const found: { route: string; html: string }[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_next" || entry.name === "admin") continue;
        walk(full);
      } else if (entry.name === "index.html") {
        const rel = path.relative(dir, path.dirname(full)).split(path.sep).join("/");
        found.push({ route: rel ? `/${rel}/` : "/", html: fs.readFileSync(full, "utf8") });
      }
    }
  };
  walk(dir);
  return found;
}

// The marker-keeping export lands in the relocated build directory, or in an `out` folder inside it.
const exported = [LAUNCH_DIR, path.join(LAUNCH_DIR, "out")].find((d) =>
  fs.existsSync(path.join(d, "index.html")),
);
if (!exported) {
  console.error(
    `✖ No marker-keeping build found in ${path.relative(ROOT, LAUNCH_DIR)}. Run without --skip-build.`,
  );
  process.exit(1);
}

const placeholders: Placeholder[] = pages(exported).flatMap((p) => placeholdersIn(p.route, p.html));
const { content } = readContent({ root: CONTENT_DIR, includeDrafts: false });
const flagged = flaggedEntries(content);

const byPage = new Map<string, Placeholder[]>();
for (const p of placeholders) byPage.set(p.page, [...(byPage.get(p.page) ?? []), p]);

console.log("\n── Placeholder text that production pages would show");
if (placeholders.length === 0) console.log("✔ None.");
for (const [page, list] of [...byPage].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${page}`);
  for (const p of list)
    console.log(`    ${p.where === "page source" ? "[source] " : ""}“${p.text}”`);
}

console.log("\n── Published entries still flagged TODO_CONFIRM");
if (flagged.length === 0) console.log("✔ None.");
for (const f of flagged) {
  console.log(`  content/${f.file}${f.path ? ` › ${f.path}` : ""}`);
  if (f.note) console.log(`    ${f.note.length > 150 ? `${f.note.slice(0, 147)}…` : f.note}`);
}

const blocked = placeholders.length > 0 || flagged.length > 0;
// These are quick, and a launch needs all of them, so they always run: one report says everything that is left.
const checksPassed = [
  run("HTML audit (production build)", npm, ["run", "audit:html"]),
  run("Link check (production build)", npm, ["run", "links"]),
  run("Spell check", npm, ["run", "spell"]),
].every(Boolean);

console.log("\n── Launch check");
console.log(
  `${placeholders.length} placeholder${placeholders.length === 1 ? "" : "s"} on ${byPage.size} page${byPage.size === 1 ? "" : "s"}, ` +
    `${flagged.length} flagged ${flagged.length === 1 ? "entry" : "entries"}, audit/links/spell ${checksPassed ? "clean" : "failed"}.`,
);
if (blocked)
  console.log(
    "✖ Not ready to launch: confirm or remove the items above (npm run todo:confirm lists every placeholder).",
  );
else if (checksPassed) console.log("✔ Ready to launch.");
process.exit(reportOnly ? 0 : blocked || !checksPassed ? 1 : 0);
