/**
 * The routes the site actually serves, so navigation, footer and search can hide what does not exist yet
 * (CLAUDE.md rule 4). A route is real when it has a page file, a file in /public, or is built by the catch-all from
 * page-routes.ts (a fixed page whose gate passes, or an entry of a collection). Node-only (reads the file system).
 */
import fs from "node:fs";
import path from "node:path";
import type { DateInput } from "@/lib/dates";
import { loadContent, type ContentSet } from "./loaders";
import { missingAnchors, pagePaths, type GateContext } from "./page-routes";

const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;

function staticRoutes(appDir: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (/^[_@[]/.test(entry.name)) continue; // private, parallel and dynamic folders
        walk(next, entry.name.startsWith("(") ? segments : [...segments, entry.name]); // (group) is not in the URL
      } else if (PAGE_FILE.test(entry.name)) {
        routes.push(segments.length ? `/${segments.join("/")}/` : "/");
      }
    }
  };
  if (fs.existsSync(appDir)) walk(appDir, []);
  return routes;
}

function publicFiles(publicDir: string): string[] {
  const files: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        if (prefix === "" && (entry.name === "_img" || entry.name === "admin")) continue;
        walk(path.join(dir, entry.name), `${prefix}/${entry.name}`);
      } else {
        files.push(`${prefix}/${entry.name}`);
      }
    }
  };
  if (fs.existsSync(publicDir)) walk(publicDir, "");
  return files;
}

export interface RouteOptions {
  root?: string;
  content?: ContentSet;
  /** For time-dependent gates (a page that needs enough confirmed stats); defaults to the current time. */
  now?: DateInput;
}

let memo: Set<string> | undefined;

/**
 * Pages render one after another during a build and each asks for the route set, so the default call is computed once
 * in production. Development recomputes it, because page files and content change under it.
 */
export function getKnownRoutes(options: RouteOptions = {}): Set<string> {
  const memoise =
    process.env.NODE_ENV === "production" && !options.root && !options.content && !options.now;
  if (memoise && memo) return memo;
  const routes = computeKnownRoutes(options);
  if (memoise) memo = routes;
  return routes;
}

function computeKnownRoutes(options: RouteOptions): Set<string> {
  const root = options.root ?? process.cwd();
  const appDir = path.join(root, "src", "app");
  const routes = new Set<string>([
    ...staticRoutes(appDir),
    ...publicFiles(path.join(root, "public")),
  ]);

  const content = options.content ?? loadContent();
  // The fixed pages built by src/app/[...slug] (see page-routes.ts), and the in-page sections that do not exist.
  const gate = gateContext(root, content, options.now);
  for (const route of pagePaths(gate)) routes.add(route);
  for (const missing of missingAnchors(gate)) routes.add(missing);
  return routes;
}

function gateContext(root: string, content: ContentSet, now?: DateInput): GateContext {
  return {
    content,
    now: now ?? new Date(),
    publicFileExists: (file) => fs.existsSync(path.join(root, "public", file)),
  };
}

/** Is `public/<file>` in the build? For pages that offer a download only when the file exists. */
export function getPublicFileCheck(root = process.cwd()): (file: string) => boolean {
  return (file) => fs.existsSync(path.join(root, "public", file));
}

let pagesMemo: string[] | undefined;

/** The paths `src/app/[...slug]` builds (production computes them once per build). */
export function getPagePaths(options: RouteOptions = {}): string[] {
  const memoise =
    process.env.NODE_ENV === "production" && !options.root && !options.content && !options.now;
  if (memoise && pagesMemo) return pagesMemo;
  const paths = pagePaths(
    gateContext(options.root ?? process.cwd(), options.content ?? loadContent(), options.now),
  );
  if (memoise) pagesMemo = paths;
  return paths;
}
