import { describe, expect, it } from "vitest";
import { resolvePage, PAGES } from "@/components/pages/registry";
import {
  COLLECTION_ROUTES,
  PAGE_ROUTES,
  missingAnchors,
  pagePaths,
  type GateContext,
} from "@/content/page-routes";
import { readContent, type ContentSet } from "@/content/loaders";
import { isBuilt } from "@/lib/nav";
import { add, baseline, person, ROOT, startup } from "./helpers";
import path from "node:path";

const NOW = "2026-10-13T12:00:00+05:30";

function gate(content: ContentSet, files: string[] = []): GateContext {
  return { content, now: NOW, publicFileExists: (f) => files.includes(f) };
}

const real = () => readContent({ root: path.join(ROOT, "content"), includeDrafts: false }).content;

describe("pagePaths", () => {
  it("builds only the pages that have something to say", () => {
    const paths = pagePaths(gate(baseline()));
    // Always there: they need no content.
    for (const always of ["/about/mentors/", "/apply/", "/contact/", "/careers/", "/sitemap/"]) {
      expect(paths).toContain(always);
    }
    // Stages come from the stages collection.
    expect(paths).toContain("/incubation/catalyse/");
    // Absent without their content.
    for (const absent of [
      "/startups/",
      "/events/",
      "/news/",
      "/documents/",
      "/about/impact/",
      "/about/partners/",
      "/incubation/funding/",
      "/incubation/facilities/instruments/",
    ]) {
      expect(paths, absent).not.toContain(absent);
    }
  });

  it("builds the open-calls page only when a call is on file", () => {
    const content = baseline();
    expect(pagePaths(gate(content))).not.toContain("/opportunities/");
    add(content, "opportunities", {
      slug: "intake",
      title: "Intake",
      kind: "cohort-intake",
      sponsor: "IICE",
      summary: "An intake.",
      window: { rolling: true },
      applyHref: "/apply/",
    });
    expect(pagePaths(gate(content))).toContain("/opportunities/");
  });

  it("adds a collection's pages when it has entries", () => {
    const content = baseline();
    add(content, "startups", startup("acme"));
    const paths = pagePaths(gate(content));
    expect(paths).toContain("/startups/");
    expect(paths).toContain("/startups/acme/");
  });

  it("lists the team page only when someone is listed on it", () => {
    const content = baseline();
    expect(pagePaths(gate(content))).not.toContain("/about/team/");
    add(content, "people", person("asha", { team: { role: "Coordinator", order: 1 } }));
    expect(pagePaths(gate(content))).toContain("/about/team/");
  });

  it("offers the documents page only when a PDF is in the build", () => {
    const content = baseline();
    add(content, "documents", {
      slug: "policy",
      title: "Policy",
      category: "policy",
      date: null,
      file: "documents/policy.pdf",
    });
    expect(pagePaths(gate(content))).not.toContain("/documents/");
    expect(pagePaths(gate(content, ["documents/policy.pdf"]))).toContain("/documents/");
  });

  it("gates the impact page on three confirmed figures", () => {
    const content = baseline();
    const stat = (id: string, value: number) => ({
      kind: "manual",
      id,
      label: id,
      value,
      source: "test",
      order: 1,
    });
    content.singletons.stats = {
      file: "stats.json",
      data: { items: [stat("a", 1), stat("b", 2)] } as never,
    };
    expect(pagePaths(gate(content))).not.toContain("/about/impact/");
    content.singletons.stats = {
      file: "stats.json",
      data: { items: [stat("a", 1), stat("b", 2), stat("c", 3)] } as never,
    };
    expect(pagePaths(gate(content))).toContain("/about/impact/");
  });
});

describe("gated anchors", () => {
  it("hides the booking link until something can be booked", () => {
    const content = baseline();
    expect(missingAnchors(gate(content))).toContain("!/incubation/facilities/#booking");
    add(content, "facilities", {
      slug: "lab",
      name: "Lab",
      category: "labs-instruments",
      description: "A lab.",
      bookable: true,
    });
    expect(missingAnchors(gate(content))).not.toContain("!/incubation/facilities/#booking");
  });

  it("makes isBuilt say no to a hidden anchor even though its page exists", () => {
    const routes = new Set(["/incubation/facilities/", "!/incubation/facilities/#booking"]);
    expect(isBuilt("/incubation/facilities/", routes)).toBe(true);
    expect(isBuilt("/incubation/facilities/#booking", routes)).toBe(false);
  });
});

describe("the page registry", () => {
  it("has a page for every fixed route", () => {
    for (const route of PAGE_ROUTES) expect(PAGES[route.path], route.path).toBeDefined();
  });

  it("has no page for a route nobody builds", () => {
    const known = new Set(PAGE_ROUTES.map((r) => r.path));
    for (const path of Object.keys(PAGES)) expect(known.has(path), path).toBe(true);
  });

  it("resolves collection routes by their prefix", () => {
    for (const { prefix } of COLLECTION_ROUTES) {
      expect(resolvePage(`/${prefix}/anything/`), prefix).toBeDefined();
    }
    expect(resolvePage("/nowhere/")).toBeUndefined();
    expect(resolvePage("/startups/a/b/")).toBeUndefined();
  });

  it("gives every built page its own title and description", () => {
    const content = real();
    const paths = pagePaths({ content, now: NOW, publicFileExists: () => false });
    const seen = new Map<string, string>();
    const descriptions = new Map<string, string>();
    for (const route of paths) {
      const page = resolvePage(route);
      expect(page, route).toBeDefined();
      const { title, description } = (page as NonNullable<typeof page>).meta();
      expect(title.length, route).toBeGreaterThan(0);
      expect(description.length, route).toBeGreaterThan(20);
      expect(seen.get(title), `${route} repeats the title of ${seen.get(title)}`).toBeUndefined();
      expect(
        descriptions.get(description),
        `${route} repeats the description of ${descriptions.get(description)}`,
      ).toBeUndefined();
      seen.set(title, route);
      descriptions.set(description, route);
    }
  });
});
