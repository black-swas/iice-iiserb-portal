import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContentError, formatIssue, loadContent, readContent } from "@/content/loaders";
import { singletonKeys } from "@/content/registry";
import { messagesOf } from "./helpers";

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "iice-content-"));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const put = (file: string, text: string) => {
  const abs = path.join(root, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
};
const json = (file: string, value: unknown) => put(file, JSON.stringify(value));
const read = (includeDrafts = true) => readContent({ root, includeDrafts });
const errors = (issues: ReturnType<typeof read>["issues"]) =>
  messagesOf(issues.filter((i) => i.severity === "error"));

const announcement = (extra: Record<string, unknown> = {}) => ({
  slug: "notice",
  text: "Hello",
  kind: "notice",
  startsAt: "2026-10-01T00:00:00+05:30",
  expiresAt: "2026-11-01T00:00:00+05:30",
  ...extra,
});
const eventFrontMatter = (extra = "") =>
  `---\nslug: talk\ntitle: Talk\ntype: talk\nstartsAt: "2026-10-20T10:00:00+05:30"\nmode: online\nsummary: s\n${extra}---\n`;

describe("readContent", () => {
  it("reports every missing singleton, and does not throw", () => {
    const { issues } = read();
    expect(issues.filter((i) => i.message === "required file is missing")).toHaveLength(
      singletonKeys.length,
    );
  });

  it("reports a missing content directory", () => {
    const { issues } = readContent({ root: path.join(root, "nope") });
    expect(issues[0]?.message).toContain("content directory not found");
  });

  it("reports invalid JSON with the file name", () => {
    put("announcements/bad.json", "{ not json");
    const found = errors(read().issues);
    expect(found.some((m) => m.startsWith("announcements/bad.json › : cannot parse JSON"))).toBe(
      true,
    );
  });

  it("reports an unknown field by its full path, so a typo is caught", () => {
    json("announcements/notice.json", announcement({ extraField: "typo" }));
    const found = errors(read().issues);
    expect(found).toContain(
      "announcements/notice.json › extraField: unknown field (check the spelling, or add it to src/content/schema.ts and the CMS config)",
    );
  });

  it("reports a bad value with the field path and the schema's message", () => {
    json("announcements/notice.json", announcement({ href: "#" }));
    const found = errors(read().issues).filter((m) =>
      m.startsWith("announcements/notice.json › href"),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("must be a site path like /apply/");
  });

  it("reports a missing required field", () => {
    json("announcements/notice.json", { slug: "notice", kind: "notice" });
    const paths = read()
      .issues.filter((i) => i.file === "announcements/notice.json")
      .map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["text", "startsAt", "expiresAt"]));
  });

  it("requires the slug to equal the filename", () => {
    json("announcements/notice.json", announcement({ slug: "other" }));
    const found = errors(read().issues);
    expect(found).toContain(
      'announcements/notice.json › slug: must equal the filename: expected "notice", found "other"',
    );
  });

  it("returns valid entries with their file path", () => {
    json("announcements/notice.json", announcement());
    const { content, issues } = read();
    expect(errors(issues).filter((m) => m.startsWith("announcements/"))).toEqual([]);
    expect(content.collections.announcements).toHaveLength(1);
    expect(content.collections.announcements[0]?.file).toBe("announcements/notice.json");
    expect(content.collections.announcements[0]?.data.priority).toBe(5);
  });

  it("excludes drafts when asked, and still validates them", () => {
    json("announcements/notice.json", announcement({ draft: true }));
    json("announcements/broken.json", { slug: "broken", draft: true });
    expect(read(true).content.collections.announcements).toHaveLength(1);
    const production = read(false);
    expect(production.content.collections.announcements).toHaveLength(0);
    expect(errors(production.issues).some((m) => m.startsWith("announcements/broken.json"))).toBe(
      true,
    );
  });
});

describe("Markdown and MDX", () => {
  it("returns the body next to the front matter, with line endings normalised", () => {
    put("events/talk.md", `${eventFrontMatter()}\r\nFirst line\r\nSecond line\r\n`);
    const [entry] = read().content.collections.events;
    expect(entry?.data.body).toBe("First line\nSecond line");
    expect(entry?.data.title).toBe("Talk");
  });

  it("keeps unquoted dates as strings (YAML 1.2), so a hand-written date does not become a Date", () => {
    put("events/talk.md", `${eventFrontMatter("updatedAt: 2026-08-08\n")}\nBody`);
    const { content, issues } = read();
    expect(errors(issues).filter((m) => m.startsWith("events/"))).toEqual([]);
    expect(content.collections.events[0]?.data.updatedAt).toBe("2026-08-08");
  });

  it("accepts an unquoted datetime too", () => {
    put(
      "events/talk.md",
      `---\nslug: talk\ntitle: T\ntype: talk\nstartsAt: 2026-10-20T10:00:00+05:30\nmode: online\nsummary: s\n---\nBody`,
    );
    expect(errors(read().issues).filter((m) => m.startsWith("events/"))).toEqual([]);
  });

  it("reports malformed front matter", () => {
    put("events/talk.md", "---\ntitle: [unclosed\n---\nBody");
    expect(
      errors(read().issues).some((m) => m.startsWith("events/talk.md › : cannot parse MD")),
    ).toBe(true);
  });

  it("handles a file with no front matter by validating an empty object", () => {
    put("events/talk.md", "Just a body, no front matter");
    expect(
      read().issues.filter((i) => i.file === "events/talk.md" && i.severity === "error").length,
    ).toBeGreaterThan(0);
  });

  it("strips a UTF-8 byte-order mark (Windows editors add one)", () => {
    json("announcements/notice.json", announcement());
    put("announcements/notice.json", `﻿${JSON.stringify(announcement())}`);
    expect(errors(read().issues).filter((m) => m.startsWith("announcements/"))).toEqual([]);
  });
});

describe("stray files", () => {
  it("warns about a top-level name that is not a collection (typo in a folder name)", () => {
    put("startup/a.md", "x");
    const warning = read().issues.find((i) => i.file === "startup");
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("typo");
  });

  it("warns about a file with the wrong extension, and about nested folders", () => {
    put("announcements/notes.txt", "x");
    put("announcements/nested/a.json", "{}");
    const warnings = read()
      .issues.filter((i) => i.severity === "warning")
      .map((i) => i.file);
    expect(warnings).toEqual(
      expect.arrayContaining(["announcements/notes.txt", "announcements/nested"]),
    );
  });

  it("does not treat pages/home.json as a stray file in the pages collection", () => {
    json("pages/home.json", { not: "validated here as a page" });
    const issues = read().issues.filter((i) => i.file === "pages/home.json");
    expect(issues.some((i) => i.message.includes("ignored"))).toBe(false);
  });

  it("ignores dotfiles such as .gitkeep", () => {
    put("announcements/.gitkeep", "");
    expect(read().issues.filter((i) => i.file.includes(".gitkeep"))).toEqual([]);
  });
});

describe("ContentError", () => {
  it("formats as `content/<file> › <path>: <message>` and counts only errors", () => {
    const error = new ContentError([
      { severity: "error", file: "events/foo.md", path: "people[1].name", message: "Required" },
      { severity: "warning", file: "events/foo.md", path: "", message: "ignored" },
    ]);
    expect(error.message).toContain("1 error");
    expect(error.message).toContain("content/events/foo.md › people[1].name: Required");
    expect(error.message).not.toContain("ignored");
    expect(formatIssue({ severity: "error", file: "stats.json", path: "", message: "bad" })).toBe(
      "content/stats.json: bad",
    );
  });
});

describe("loadContent against the real /content", () => {
  it("returns the same object until a file changes", () => {
    expect(loadContent()).toBe(loadContent());
  });
});
