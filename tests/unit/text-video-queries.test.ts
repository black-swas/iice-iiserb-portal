import { describe, expect, it } from "vitest";
import { ICONS } from "@/components/ui/Icon";
import {
  derivedCounts,
  downloadableDocuments,
  openJobs,
  publicStatsOf,
  splitEvents,
} from "@/content/queries";
import { readContent } from "@/content/loaders";
import { windowLabel } from "@/lib/status-label";
import { formatFileSize, matchesQuery, normalise, parseEmphasis, stripEmphasis } from "@/lib/text";
import { youtubeEmbedUrl } from "@/lib/video";
import { add, baseline, ROOT } from "./helpers";
import path from "node:path";

const NOW = "2026-10-13T12:00:00+05:30";

describe("text helpers", () => {
  it("normalises case, accents and spacing", () => {
    expect(normalise("  Café   Lab ")).toBe("cafe lab");
  });
  it("matches when every word is somewhere in the text", () => {
    expect(matchesQuery("Adit Bioscience: diagnostics for rural clinics", "rural adit")).toBe(true);
    expect(matchesQuery("Adit Bioscience", "adit imaging")).toBe(false);
    expect(matchesQuery("anything", "   ")).toBe(true);
  });
  it("formats a file size the way people read it", () => {
    expect(formatFileSize(0.2)).toBe("1 KB");
    expect(formatFileSize(420)).toBe("420 KB");
    expect(formatFileSize(1229)).toBe("1.2 MB");
    expect(formatFileSize(25_000)).toBe("24 MB");
  });
  it("splits emphasis marked with asterisks", () => {
    expect(parseEmphasis("Where *science* becomes a *startup*.")).toEqual([
      { text: "Where ", emphasis: false },
      { text: "science", emphasis: true },
      { text: " becomes a ", emphasis: false },
      { text: "startup", emphasis: true },
      { text: ".", emphasis: false },
    ]);
    expect(stripEmphasis("Where *science* becomes a *startup*.")).toBe(
      "Where science becomes a startup.",
    );
  });
  it("leaves a stray asterisk alone", () => {
    expect(parseEmphasis("5 * 3 and *one")).toEqual([{ text: "5 * 3 and *one", emphasis: false }]);
  });
});

describe("youtubeEmbedUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abcDEF12345", "abcDEF12345"],
    ["https://youtu.be/abcDEF12345?t=4", "abcDEF12345"],
    ["https://www.youtube.com/embed/abcDEF12345", "abcDEF12345"],
    ["https://m.youtube.com/shorts/abcDEF12345", "abcDEF12345"],
  ])("turns %s into the privacy-enhanced embed", (url, id) => {
    expect(youtubeEmbedUrl(url)).toBe(`https://www.youtube-nocookie.com/embed/${id}?rel=0`);
  });
  it("leaves other hosts, and bad links, as plain links", () => {
    expect(youtubeEmbedUrl("https://vimeo.com/123456")).toBeNull();
    expect(youtubeEmbedUrl("https://www.youtube.com/watch")).toBeNull();
    expect(youtubeEmbedUrl("not a url")).toBeNull();
  });
});

describe("window status words", () => {
  it("says what is true at the given time", () => {
    expect(
      windowLabel(
        { opensAt: "2026-10-01T00:00:00+05:30", closesAt: "2026-11-30T23:59:00+05:30" },
        NOW,
      ),
    ).toMatchObject({
      status: "open",
      text: "Open · closes 30 Nov 2026",
      tone: "success",
    });
    expect(windowLabel({ rolling: true }, NOW).text).toBe("Rolling applications");
    expect(windowLabel({ opensAt: "2026-12-01T00:00:00+05:30" }, NOW).text).toBe(
      "Opens 1 Dec 2026",
    );
    expect(windowLabel({ closesAt: "2026-10-01T00:00:00+05:30" }, NOW).text).toBe("Closed");
    expect(windowLabel({}, NOW).text).toBe("To be announced");
  });
});

describe("content questions", () => {
  it("counts only confirmed figures for the impact strip", () => {
    const content = readContent({ root: path.join(ROOT, "content"), includeDrafts: false }).content;
    const stats = publicStatsOf(content, NOW);
    expect(stats.map((s) => s.id)).toEqual(["incubation-space"]);
    expect(derivedCounts(content, NOW).startupsTotal).toBe(0); // all 14 are still "unconfirmed"
  });

  it("splits events into upcoming (soonest first) and past (latest first)", () => {
    const events = [
      { startsAt: "2026-08-08T00:00:00+05:30", allDay: true },
      { startsAt: "2026-12-01T10:00:00+05:30" },
      { startsAt: "2026-11-01T10:00:00+05:30" },
      { startsAt: "2026-05-11T00:00:00+05:30", allDay: true },
    ] as { startsAt: string; endsAt?: string; allDay?: boolean }[];
    const { upcoming, past } = splitEvents(events, NOW);
    expect(upcoming.map((e) => e.startsAt.slice(0, 10))).toEqual(["2026-11-01", "2026-12-01"]);
    expect(past.map((e) => e.startsAt.slice(0, 10))).toEqual(["2026-08-08", "2026-05-11"]);
  });

  it("lists only documents whose PDF exists", () => {
    const content = baseline();
    add(content, "documents", {
      slug: "a",
      title: "A",
      category: "policy",
      date: null,
      file: "documents/a.pdf",
    });
    add(content, "documents", {
      slug: "b",
      title: "B",
      category: "policy",
      date: null,
      file: "documents/b.pdf",
    });
    const docs = content.collections.documents.map((d) => d.data);
    expect(downloadableDocuments(docs, (f) => f === "documents/a.pdf").map((d) => d.slug)).toEqual([
      "a",
    ]);
  });

  it("hides a job the day after it closes, and lists the soonest closing first", () => {
    const content = baseline();
    const job = (slug: string, closesAt: string) => ({
      slug,
      title: slug,
      track: "work-with-iice",
      type: "full-time",
      postedAt: "2026-09-01",
      closesAt,
      apply: { email: "iice@iiserb.ac.in" },
    });
    add(content, "jobs", job("later", "2026-12-31"), { body: "x" });
    add(content, "jobs", job("soon", "2026-10-13"), { body: "x" });
    add(content, "jobs", job("gone", "2026-10-12"), { body: "x" });
    expect(
      openJobs(
        content.collections.jobs.map((j) => j.data),
        NOW,
      ).map((j) => j.slug),
    ).toEqual(["soon", "later"]);
  });
});

describe("icons", () => {
  it("registers every icon the content names", () => {
    const names = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
          if (key === "icon" && typeof child === "string") names.add(child);
          else walk(child);
        }
      }
    };
    const { content } = readContent({ root: path.join(ROOT, "content"), includeDrafts: true });
    walk(content.singletons.ecosystemTiles?.data);
    walk(content.singletons.paths?.data);
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) expect(ICONS[name], name).toBeDefined();
  });
});
