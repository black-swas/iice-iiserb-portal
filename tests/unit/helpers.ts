/** Fixture builders shared by the content tests. Entries are parsed through the real schemas, so defaults are filled in. */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { IntegrityContext } from "@/content/integrity";
import type { ContentIssue, ContentSet, Loaded } from "@/content/loaders";
import { collectionKeys, collections, type CollectionKey } from "@/content/registry";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const NOW = "2026-10-13T12:00:00+05:30";
export const messages: unknown = JSON.parse(
  readFileSync(path.join(ROOT, "messages", "en.json"), "utf8"),
);

export function emptyContent(): ContentSet {
  return {
    collections: Object.fromEntries(
      collectionKeys.map((k) => [k, []]),
    ) as unknown as ContentSet["collections"],
    singletons: {},
  };
}

/** Parses `data` with the collection's schema and appends it, optionally with a Markdown body. */
export function add(
  content: ContentSet,
  key: CollectionKey,
  data: Record<string, unknown>,
  options: { file?: string; body?: string } = {},
): void {
  const parsed = collections[key].schema.parse(data) as Record<string, unknown>;
  if (options.body !== undefined) parsed.body = options.body;
  const ext = collections[key].format;
  (content.collections[key] as unknown as Loaded<unknown>[]).push({
    data: parsed,
    file: options.file ?? `${collections[key].dir}/${String(parsed.slug)}.${ext}`,
  });
}

const PHASES = ["Pre-incubation", "Incubation", "Acceleration"] as const;
export const stage = (slug: string, order: number, extra: Record<string, unknown> = {}) => ({
  slug,
  order,
  name: slug,
  phase: PHASES[order - 1],
  tagline: "tagline",
  oneLiner: `One-liner for ${slug}`,
  audience: ["Anyone"],
  schemeSlugs: [],
  offerings: ["one", "two", "three"],
  ...extra,
});
export const person = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug,
  name: slug,
  ...extra,
});
export const startup = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug,
  name: slug,
  oneLiner: `About ${slug}`,
  sectors: ["other"],
  status: "current",
  ...extra,
});
export const committee = (slug: string, members: unknown[] = []) => ({ slug, name: slug, members });

/** Three stages and four committees: the minimum for "no unrelated errors". */
export function baseline(): ContentSet {
  const content = emptyContent();
  add(content, "stages", stage("catalyse", 1));
  add(content, "stages", stage("culture", 2));
  add(content, "stages", stage("commercialise", 3));
  for (const slug of ["managing", "executive", "technical-evaluation", "management-advisory"]) {
    add(content, "committees", committee(slug));
  }
  return content;
}

export const ctx = (over: Partial<IntegrityContext> = {}): IntegrityContext => ({
  now: NOW,
  contentFileExists: () => true,
  publicFileExists: () => true,
  messages,
  ...over,
});

export const errorsOf = (issues: ContentIssue[]) => issues.filter((i) => i.severity === "error");
export const warningsOf = (issues: ContentIssue[]) =>
  issues.filter((i) => i.severity === "warning");
export const messagesOf = (issues: ContentIssue[]) =>
  issues.map((i) => `${i.file} › ${i.path}: ${i.message}`);
