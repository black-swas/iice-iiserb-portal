/** The real /content: valid, internally consistent, and faithful to the legacy site where the docs say it must be. */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeDerived, publicStats, resolveStats } from "@/content/derived";
import { checkIntegrity } from "@/content/integrity";
import { readContent, type ContentSet } from "@/content/loaders";
import { collectionKeys } from "@/content/registry";
import { collectTodos, displayDeep, isFlagged } from "@/content/todo";
import { eventStatus } from "@/lib/status";
import { NOW, ROOT, errorsOf, messages, messagesOf } from "./helpers";

const CONTENT = path.join(ROOT, "content");
const { content, issues } = readContent({ root: CONTENT, includeDrafts: true });

const integrity = checkIntegrity(content, {
  now: NOW,
  contentFileExists: (p) => fs.existsSync(path.join(CONTENT, p)),
  publicFileExists: (p) => fs.existsSync(path.join(ROOT, "public", p)),
  messages,
});

const all = [
  ...collectionKeys.flatMap((k) => content.collections[k] as { data: unknown; file: string }[]),
  ...Object.values(content.singletons),
];
const slugs = (key: keyof ContentSet["collections"]) =>
  content.collections[key].map((e) => (e.data as { slug: string }).slug);
const stage = (slug: string) => content.collections.stages.find((s) => s.data.slug === slug)!.data;
const committee = (slug: string) =>
  content.collections.committees.find((c) => c.data.slug === slug)!.data;

describe("validity", () => {
  it("parses and validates every file", () => {
    expect(messagesOf(errorsOf(issues))).toEqual([]);
  });

  it("passes the cross-entry rules", () => {
    expect(messagesOf(errorsOf(integrity))).toEqual([]);
  });

  it("has no stray files or folders", () => {
    expect(messagesOf(issues.filter((i) => i.severity === "warning"))).toEqual([]);
  });
});

describe("faithful to the legacy site", () => {
  it("lists the 14 startup names from the legacy page", () => {
    expect(content.collections.startups).toHaveLength(14);
    expect(content.collections.startups.map((s) => s.data.legalName ?? s.data.name).sort()).toEqual(
      [
        "Plabeltech Pvt Ltd",
        "Intisen Technology Pvt Ltd",
        "Adit Bioscience Pvt Ltd",
        "Powernet Technology Pvt Ltd",
        "Richnex Skinscience Laboratory Pvt Ltd",
        "Konarq Technologies",
        "Protomate AI Pvt Ltd",
        "SimDaas Autonomy Pvt Ltd",
        "Miniguru T-Labs",
        "Beyond Limit Devices",
        "Xtalsphere Pvt Ltd",
        "Luminojen Pvt Ltd",
        "MBiosys Pvt Ltd",
        "Cytoforge Therapeutics Pvt Ltd",
      ].sort(),
    );
  });

  it("seeds the three committees with the legacy sizes, and leaves the advisory one empty", () => {
    expect(committee("managing").members).toHaveLength(7);
    expect(committee("executive").members).toHaveLength(6);
    expect(committee("technical-evaluation").members).toHaveLength(9);
    expect(committee("management-advisory").members).toHaveLength(0);
  });

  it("uses the corrected spellings of the legacy typos in published text (notes may quote them)", () => {
    expect(committee("managing").members.map((m) => m.committeeRole)).toContain("Treasurer");
    const withoutNotes = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(withoutNotes)
        : typeof value === "object" && value !== null
          ? Object.fromEntries(
              Object.entries(value)
                .filter(([k]) => !k.startsWith("_"))
                .map(([k, v]) => [k, withoutNotes(v)]),
            )
          : value;
    const hits = all.flatMap((entry) => {
      const text = JSON.stringify(withoutNotes(entry!.data));
      // cspell:disable -- these are the legacy misspellings the content must not contain
      const legacyTypos = [
        "Tresurer",
        "Deputing",
        "Bussiness",
        "Colleteral",
        "Intrument",
        "Mision",
        "Committes",
        "Acadamia",
      ];
      // cspell:enable
      return legacyTypos
        .filter((typo) => text.includes(typo))
        .map((typo) => `${entry!.file}: ${typo}`);
    });
    expect(hits).toEqual([]);
  });

  it("lists the 12 legacy facilities", () => {
    expect(content.collections.facilities).toHaveLength(12);
  });

  it("keeps the Innovation Club list to the 10 distinct members", () => {
    const club = content.singletons.innovationClub!.data;
    const names = club.pastMembers.map((m) => `${m.name}|${m.programme}|${m.batch}`);
    expect(names).toHaveLength(10);
    expect(new Set(names).size).toBe(10);
    expect(club.pillars.map((p) => p.name)).toEqual(["Culture", "Conduct", "Connect"]);
  });

  it("has the four stages' redirect targets that the SRD §7.2 table names", () => {
    const bySlug = new Map(content.collections.events.map((e) => [e.data.legacyPath, e.data.slug]));
    expect(bySlug.get("/activities/aesdp")).toBe("a-esdp-data-science-2026");
    expect(bySlug.get("/activities/ramp")).toBe("ramp-mp-laghu-udyog-nigam-orientation-2026");
    expect(bySlug.get("/activities/ramp-day-2-11-may")).toBe("ramp-msme-exposure-session-2026");
    expect(bySlug.get("/activities/industry-acadamia-conclave-2-0")).toBe(
      "industry-academia-conclave-2026",
    );
  });

  it("migrates the legacy events with their verified dates", () => {
    const start = (slug: string) =>
      content.collections.events.find((e) => e.data.slug === slug)!.data.startsAt;
    expect(start("iisf-2022-startup-conclave")).toBe("2023-01-21T00:00:00+05:30");
    expect(start("startup-studio-lab-to-market")).toBe("2023-03-29T16:30:00+05:30");
    expect(start("nurturing-sustainable-incubation-ecosystem")).toBe("2024-01-16T00:00:00+05:30");
    expect(start("industry-academia-conclave-2026")).toBe("2026-08-08T00:00:00+05:30");
    expect(slugs("events")).toHaveLength(9);
  });

  it("treats every seeded event as already held on the build date", () => {
    for (const { data } of content.collections.events)
      expect(eventStatus(data, NOW), data.slug).toBe("past");
  });

  it("has the stages in order, with every unknown left as null", () => {
    expect(["catalyse", "culture", "commercialise"].map((s) => stage(s).order)).toEqual([1, 2, 3]);
    for (const s of ["catalyse", "culture", "commercialise"]) {
      expect(stage(s).duration).toBeNull();
      expect(stage(s).fundingBand).toBeNull();
    }
  });

  it("ties the three seeded milestones to events that exist", () => {
    const eventSlugs = new Set(slugs("events"));
    for (const m of content.singletons.milestones!.data.items) {
      expect(eventSlugs.has(m.href!.split("/")[2] as string), m.id).toBe(true);
    }
  });
});

describe("honesty (CLAUDE.md rule 1)", () => {
  it("flags every entry whose facts are not confirmed, and explains why", () => {
    const flagged = all.filter((e) => isFlagged(e!.data));
    expect(flagged.length).toBeGreaterThan(20);
    for (const entry of flagged) {
      const note = (entry!.data as { _note?: string })._note;
      expect(note, `${entry!.file} is flagged without a _note`).toBeTruthy();
    }
  });

  it("has only one confirmed number in the stats: the incubation space, with a source and a date", () => {
    const stats = content.singletons.stats!.data.items;
    const withValue = stats.filter((s) => s.kind === "manual" && s.value !== null);
    expect(withValue.map((s) => s.id)).toContain("incubation-space");
    expect(withValue[0]).toMatchObject({ value: 10_000, unit: "sqft", asOf: "2026-10-12" });
    for (const s of stats)
      if (s.kind === "manual" && s.value === null) expect(isFlagged(s), s.id).toBe(true);
  });

  it("shows no stat counter in production but the space: the Home strip needs at least three", () => {
    const derived = computeDerived(
      {
        startups: content.collections.startups.map((e) => e.data),
        events: content.collections.events.map((e) => e.data),
        fundingSchemes: [],
        mentors: [],
        partners: content.collections.partners.map((e) => e.data),
        instruments: [],
      },
      NOW,
    );
    expect(derived.startupsTotal).toBe(14);
    const shown = publicStats(resolveStats(content.singletons.stats!.data.items, derived));
    expect(shown.length).toBeGreaterThanOrEqual(3);
  });

  it("never lists a startup as current, graduated or in a sector that nobody confirmed", () => {
    for (const { data } of content.collections.startups) {
      expect(data.status, data.slug).toBe("current");
      expect(data.cohortYear).toBeNull();
      expect(data.affiliation).toBeNull();
      expect(data.founders).toEqual([]);
    }
  });

  it("invents no testimonials, mentors or founders' quotes", () => {
    expect(content.collections.testimonials).toHaveLength(0);
    expect(content.collections.mentors).toHaveLength(0);
  });

  it("keeps pages without real content as drafts, so production leaves them out", () => {
    const drafts = content.collections.pages
      .filter((p) => p.data.draft)
      .map((p) => p.data.slug)
      .sort();
    expect(drafts).toEqual(["directors-message", "student-innovators"]);
    const production = readContent({ root: CONTENT, includeDrafts: false }).content;
    expect(production.collections.pages.map((p) => p.data.slug).sort()).toEqual([
      "about",
      "accessibility",
      "apply",
      "birac-edge",
      "ecosystem",
      "hyperlink-policy",
      "incubation",
      "privacy",
      "screen-reader-access",
      "support-funding",
      "terms",
    ]);
  });

  it("never leaks the TODO_CONFIRM marker into text once display() has been applied", () => {
    const strip = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(strip)
        : typeof value === "object" && value !== null
          ? Object.fromEntries(
              Object.entries(value)
                .filter(([k]) => !k.startsWith("_"))
                .map(([k, v]) => [k, strip(v)]),
            )
          : value;
    for (const entry of all) {
      const rendered = JSON.stringify(displayDeep(strip(entry!.data)));
      expect(rendered, entry!.file).not.toContain("TODO_CONFIRM");
    }
  });

  it("has a placeholder somewhere in the entries that need one, found by collectTodos", () => {
    const todos = all.flatMap((e) => collectTodos(e!.data));
    expect(todos.length).toBeGreaterThan(20);
    expect(todos.some((t) => t.kind === "entry")).toBe(true);
    expect(todos.some((t) => t.kind === "text")).toBe(true);
  });
});

describe("ecosystem and navigation", () => {
  it("has seven Why IICE tiles and four audience cards", () => {
    expect(content.singletons.ecosystemTiles!.data.items).toHaveLength(7);
    expect(content.singletons.paths!.data.items.map((p) => p.audience)).toEqual([
      "founders",
      "students",
      "mentors",
      "investors-partners",
    ]);
  });

  it("has seven top-level nav items plus the Apply button", () => {
    const nav = content.singletons.navigation!.data;
    expect(nav.primary).toHaveLength(7);
    expect(nav.cta).toEqual({ label: "Apply for Incubation", href: "/apply/" });
  });

  it("spotlights six startups that exist", () => {
    const startups = new Set(slugs("startups"));
    const items = content.singletons.spotlight!.data.items;
    expect(items).toHaveLength(6);
    for (const item of items) expect(startups.has(item.startupSlug!), item.id).toBe(true);
  });
});
