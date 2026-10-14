/**
 * The only way pages read content (CLAUDE.md rule 7, TRD §5). Reads /content, validates every file against its Zod
 * schema, and hands typed data to Server Components. Invalid content throws with `file › field: message`.
 * Node-only (uses fs): never import this from a Client Component.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import { CONTENT_DIR } from "./root";
import type { z } from "zod";
import {
  NON_CONTENT_ENTRIES,
  collectionKeys,
  collections,
  singletonKeys,
  singletons,
  type CollectionEntry,
  type CollectionKey,
  type Format,
  type SingletonKey,
  type SingletonValue,
} from "./registry";

export const CONTENT_ROOT = CONTENT_DIR;

export interface ContentIssue {
  severity: "error" | "warning";
  /** Path relative to content/, with forward slashes. */
  file: string;
  /** Field path such as `people[1].name`. Empty for the file as a whole. */
  path: string;
  message: string;
}

export interface Loaded<T> {
  data: T;
  file: string;
}

export interface ContentSet {
  collections: { [K in CollectionKey]: Loaded<CollectionEntry<K>>[] };
  singletons: { [K in SingletonKey]?: Loaded<SingletonValue<K>> };
}

export class ContentError extends Error {
  constructor(readonly issues: ContentIssue[]) {
    super(formatIssues(issues));
    this.name = "ContentError";
  }
}

export function formatIssue(issue: ContentIssue): string {
  const where = issue.path ? `content/${issue.file} › ${issue.path}` : `content/${issue.file}`;
  return `${where}: ${issue.message}`;
}

export function formatIssues(issues: ContentIssue[]): string {
  const errors = issues.filter((i) => i.severity === "error");
  return [
    `Invalid content: ${errors.length} error${errors.length === 1 ? "" : "s"}`,
    ...errors.map(formatIssue),
  ].join("\n  ");
}

// ── Zod issue → readable lines ─────────────────────────────────
function formatPath(segments: readonly PropertyKey[]): string {
  return segments.reduce<string>((acc, seg) => {
    if (typeof seg === "number") return `${acc}[${seg}]`;
    const name = String(seg);
    return acc ? `${acc}.${name}` : name;
  }, "");
}

function describe(issue: z.core.$ZodIssue): string {
  if (issue.code === "invalid_union" && issue.errors.length > 0) {
    const messages = [...new Set(issue.errors.flat().map((e) => e.message))];
    return messages.length === 1
      ? (messages[0] as string)
      : `no variant matches: ${messages.join(" | ")}`;
  }
  return issue.message;
}

function zodIssues(file: string, error: z.ZodError): ContentIssue[] {
  return error.issues.flatMap((issue): ContentIssue[] => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        severity: "error",
        file,
        path: formatPath([...issue.path, key]),
        message:
          "unknown field (check the spelling, or add it to src/content/schema.ts and the CMS config)",
      }));
    }
    return [{ severity: "error", file, path: formatPath(issue.path), message: describe(issue) }];
  });
}

// ── File parsing ───────────────────────────────────────────────
// YAML 1.2 core schema: `date: 2026-08-08` stays a string. gray-matter's bundled parser would turn it into a Date.
const frontMatterOptions = {
  engines: { yaml: (source: string) => (YAML.parse(source) ?? {}) as object },
};

function parseFile(abs: string, format: Format): { data: unknown; body: string | undefined } {
  const text = fs.readFileSync(abs, "utf8").replace(/^﻿/, "");
  if (format === "json") return { data: JSON.parse(text), body: undefined };
  const parsed = matter(text, frontMatterOptions);
  return { data: parsed.data, body: parsed.content.replace(/\r\n/g, "\n").trim() };
}

function readOne(
  root: string,
  file: string,
  format: Format,
  schema: z.ZodType,
  issues: ContentIssue[],
): { data: Record<string, unknown> } | undefined {
  let raw: { data: unknown; body: string | undefined };
  try {
    raw = parseFile(path.join(root, file), format);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push({
      severity: "error",
      file,
      path: "",
      message: `cannot parse ${format.toUpperCase()}: ${message}`,
    });
    return undefined;
  }
  const result = schema.safeParse(raw.data);
  if (!result.success) {
    issues.push(...zodIssues(file, result.error));
    return undefined;
  }
  const data = result.data as Record<string, unknown>;
  return { data: raw.body === undefined ? data : { ...data, body: raw.body } };
}

const sortedFiles = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => !d.name.startsWith("."))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

export interface ReadOptions {
  root?: string;
  /** Drafts are validated either way; this decides whether they are returned. Production builds exclude them. */
  includeDrafts?: boolean;
}

/**
 * Reads and validates everything. Never throws for bad content: problems come back as `issues` so the validator can
 * report all of them at once. Use `loadContent()` when you want an exception instead.
 */
export function readContent(options: ReadOptions = {}): {
  content: ContentSet;
  issues: ContentIssue[];
} {
  const root = options.root ?? CONTENT_ROOT;
  const includeDrafts = options.includeDrafts ?? true;
  const issues: ContentIssue[] = [];
  const content = {
    collections: Object.fromEntries(collectionKeys.map((k) => [k, []])),
    singletons: {},
  } as unknown as ContentSet;

  if (!fs.existsSync(root)) {
    issues.push({
      severity: "error",
      file: "",
      path: "",
      message: `content directory not found: ${root}`,
    });
    return { content, issues };
  }

  const singletonFiles = new Set<string>(singletonKeys.map((k) => singletons[k].file));
  const known = new Set<string>(NON_CONTENT_ENTRIES);
  for (const k of collectionKeys) known.add(collections[k].dir);
  for (const f of singletonFiles) known.add(f.split("/")[0] as string);

  for (const entry of sortedFiles(root)) {
    if (!known.has(entry.name)) {
      issues.push({
        severity: "warning",
        file: entry.name,
        path: "",
        message: "not part of any collection or singleton, so it is ignored (typo in the name?)",
      });
    }
  }

  for (const key of singletonKeys) {
    const def = singletons[key];
    if (!fs.existsSync(path.join(root, def.file))) {
      issues.push({
        severity: "error",
        file: def.file,
        path: "",
        message: "required file is missing",
      });
      continue;
    }
    const entry = readOne(root, def.file, "json", def.schema, issues);
    if (entry)
      (content.singletons as Record<string, unknown>)[key] = { data: entry.data, file: def.file };
  }

  for (const key of collectionKeys) {
    const def = collections[key];
    const dir = path.join(root, def.dir);
    if (!fs.existsSync(dir)) continue;
    const loaded: Loaded<Record<string, unknown>>[] = [];

    for (const dirent of sortedFiles(dir)) {
      const file = `${def.dir}/${dirent.name}`;
      if (dirent.isDirectory()) {
        issues.push({
          severity: "warning",
          file,
          path: "",
          message: "unexpected folder inside a collection, ignored",
        });
        continue;
      }
      if (singletonFiles.has(file)) continue;
      const ext = path.extname(dirent.name).slice(1);
      if (ext !== def.format) {
        issues.push({
          severity: "warning",
          file,
          path: "",
          message: `ignored: this collection holds .${def.format} files`,
        });
        continue;
      }
      const entry = readOne(root, file, def.format, def.schema, issues);
      if (!entry) continue;
      const slug = path.basename(dirent.name, `.${ext}`);
      if (entry.data.slug !== slug) {
        issues.push({
          severity: "error",
          file,
          path: "slug",
          message: `must equal the filename: expected "${slug}", found "${String(entry.data.slug)}"`,
        });
        continue;
      }
      if (entry.data.draft === true && !includeDrafts) continue;
      loaded.push({ data: entry.data, file });
    }
    (content.collections as Record<string, unknown>)[key] = loaded;
  }

  return { content, issues };
}

// ── Cached, typed access for Server Components ─────────────────
function fingerprint(root: string): string {
  const parts: string[] = [];
  const walk = (dir: string, rel: string) => {
    for (const entry of sortedFiles(dir)) {
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!(rel === "" && NON_CONTENT_ENTRIES.has(entry.name)))
          walk(path.join(dir, entry.name), next);
      } else {
        const stat = fs.statSync(path.join(dir, entry.name));
        parts.push(`${next}:${stat.mtimeMs}:${stat.size}`);
      }
    }
  };
  if (fs.existsSync(root)) walk(root, "");
  return parts.join("|");
}

let cache: { key: string; content: ContentSet } | undefined;

/** Reads once per build. In development it re-reads when a content file changes, so CMS edits show up on refresh. */
export function loadContent(): ContentSet {
  const production = process.env.NODE_ENV === "production";
  const key = production ? "production" : fingerprint(CONTENT_ROOT);
  if (cache?.key === key) return cache.content;

  const { content, issues } = readContent({ includeDrafts: !production });
  if (issues.some((i) => i.severity === "error")) throw new ContentError(issues);
  cache = { key, content };
  return content;
}

export function getCollection<K extends CollectionKey>(key: K): CollectionEntry<K>[] {
  return loadContent().collections[key].map((e) => e.data);
}

export function getEntry<K extends CollectionKey>(
  key: K,
  slug: string,
): CollectionEntry<K> | undefined {
  return getCollection(key).find((e) => (e as { slug: string }).slug === slug);
}

export function getSingleton<K extends SingletonKey>(key: K): SingletonValue<K> {
  const loaded = loadContent().singletons[key];
  if (!loaded) throw new Error(`content: singleton "${key}" is missing`);
  return loaded.data;
}

export const getSiteSettings = () => getSingleton("site");
export const getNavigation = () => getSingleton("navigation");
export const getHomePage = () => getSingleton("home");
export const getStats = () => getSingleton("stats").items;
export const getEcosystemTiles = () => getSingleton("ecosystemTiles").items;
export const getPaths = () => getSingleton("paths").items;
export const getSpotlight = () => getSingleton("spotlight").items;
export const getMilestones = () => getSingleton("milestones").items;
export const getInnovationClub = () => getSingleton("innovationClub");

export const getStartups = () => getCollection("startups");
export const getStartup = (slug: string) => getEntry("startups", slug);
export const getEvents = () => getCollection("events");
export const getEvent = (slug: string) => getEntry("events", slug);
export const getStages = () => getCollection("stages").sort((a, b) => a.order - b.order);
export const getStage = (slug: string) => getEntry("stages", slug);
export const getPage = (slug: string) => getEntry("pages", slug);
export const getPeople = () => getCollection("people");
export const getPerson = (slug: string) => getEntry("people", slug);
export const getCommittees = () => getCollection("committees");
