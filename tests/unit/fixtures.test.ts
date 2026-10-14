import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkIntegrity } from "@/content/integrity";
import { formatIssue, readContent, type ContentSet } from "@/content/loaders";
import { pagePaths } from "@/content/page-routes";
import { publicStatsOf } from "@/content/queries";
import messages from "../../messages/en.json";
import { writeFullContent } from "../fixtures/full-content";

/**
 * The end-to-end tests build the site from this richer content. If it stopped satisfying the schemas and cross-entry rules,
 * the build would fail far from the cause, so it is checked here, quickly, first.
 */
const target = path.join(os.tmpdir(), `iice-fixture-${process.pid}`);
let content: ContentSet;
let issues: string[] = [];
let pdfs: string[] = [];

beforeAll(async () => {
  ({ pdfs } = await writeFullContent(target));
  const read = readContent({ root: target, includeDrafts: false });
  content = read.content;
  const integrity = checkIntegrity(content, {
    now: "2026-10-14T12:00:00+05:30",
    contentFileExists: (p) => fs.existsSync(path.join(target, p)),
    publicFileExists: (p) => pdfs.includes(path.basename(p)),
    messages,
  });
  issues = [...read.issues, ...integrity].filter((i) => i.severity === "error").map(formatIssue);
}, 60_000);

afterAll(() => fs.rmSync(target, { recursive: true, force: true }));

describe("the full-content fixture", () => {
  it("has no schema or integrity errors", () => {
    expect(issues).toEqual([]);
  });

  it("makes every page the seed content hides appear", () => {
    const paths = pagePaths({
      content,
      now: "2026-10-14T12:00:00+05:30",
      publicFileExists: (f) => pdfs.includes(path.basename(f)),
    });
    for (const route of [
      "/about/impact/",
      "/about/mentors/",
      "/documents/",
      "/news/",
      "/about/in-the-news/",
      "/incubation/funding/",
      "/incubation/funding/fx-scheme/",
      "/incubation/facilities/instruments/",
      "/events/fx-upcoming-workshop/",
      "/news/fx-news-one/",
    ]) {
      expect(paths, route).toContain(route);
    }
  });

  it("confirms enough figures for the impact strip", () => {
    expect(publicStatsOf(content, "2026-10-14T12:00:00+05:30").length).toBeGreaterThanOrEqual(3);
  });
});
