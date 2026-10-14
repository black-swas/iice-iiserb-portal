/**
 * npm run test:e2e [-- --skip-build] [playwright args]. Builds two copies of the site and tests both with Playwright:
 *  - the preview of the real content (every planned page shown, flagged), served from out/ on port 4173;
 *  - the same site built from tests/fixtures/full-content.ts, which fills in what the seed leaves empty (schemes, news,
 *    mentors, instruments, jobs, PDFs…), served from .cache/e2e/full on port 4174, so every page and component is exercised.
 * Cross-platform: no shell syntax, no bash-only env prefix.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FIXTURE_PDF, writeFullContent } from "../tests/fixtures/full-content";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const passThrough = args.filter((a) => a !== "--skip-build");
const windows = process.platform === "win32";

// A made-up address on the reserved .invalid domain: the tests answer it themselves, so no form data ever leaves the machine.
const PREVIEW_ENV = {
  NEXT_PUBLIC_SHOW_TODOS: "1",
  NEXT_PUBLIC_FORM_ENDPOINT: "https://forms.iice-test.invalid/exec",
};

function run(command: string, commandArgs: string[], env: Record<string, string> = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: windows, // .cmd shims need a shell on Windows
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const npm = windows ? "npm.cmd" : "npm";

async function buildFull() {
  const content = path.join(ROOT, ".cache", "e2e", "content-full");
  const destination = path.join(ROOT, ".cache", "e2e", "full");
  const { pdfs } = await writeFullContent(content);
  const documents = path.join(ROOT, "public", "documents");
  const hadDocuments = fs.existsSync(documents);
  fs.mkdirSync(documents, { recursive: true });
  const written = pdfs.filter((name) => !fs.existsSync(path.join(documents, name)));
  for (const name of written) fs.writeFileSync(path.join(documents, name), FIXTURE_PDF);
  try {
    // Build to a throwaway copy: out/ is overwritten by the preview build that follows.
    run(npm, ["run", "build"], { ...PREVIEW_ENV, IICE_CONTENT_DIR: content });
    fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(path.join(ROOT, "out"), destination, { recursive: true });
  } finally {
    // The fixture PDFs were never part of the repository: leave public/ as it was.
    for (const name of written) fs.rmSync(path.join(documents, name), { force: true });
    if (!hadDocuments && fs.readdirSync(documents).length === 0) fs.rmdirSync(documents);
  }
}

if (!skipBuild) {
  await buildFull();
  run(npm, ["run", "build"], PREVIEW_ENV);
}
run(windows ? "npx.cmd" : "npx", ["playwright", "test", ...passThrough]);
