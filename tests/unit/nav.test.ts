import { describe, expect, it } from "vitest";
import {
  isBuilt,
  isCurrentPage,
  isCurrentSection,
  resolveFooterGroups,
  resolveNavigation,
  routeOf,
} from "@/lib/nav";
import { Navigation } from "@/content/schema";

const routes = new Set(["/", "/apply/", "/about/", "/about/team/", "/startups/", "/news/rss.xml"]);

const nav = Navigation.parse({
  primary: [
    {
      label: "About",
      groups: [
        {
          title: "Who we are",
          links: [
            { label: "Overview", href: "/about/" },
            { label: "Impact", href: "/about/impact/" },
          ],
        },
        { title: "Soon", links: [{ label: "Mentors", href: "/about/mentors/" }] },
      ],
    },
    { label: "Startups", href: "/startups/" },
    { label: "BIRAC Edge", href: "/birac-edge/" },
    {
      label: "Incubation",
      groups: [{ title: "Journey", links: [{ label: "Catalyse", href: "/incubation/catalyse/" }] }],
    },
  ],
  cta: { label: "Apply for Incubation", href: "/apply/" },
});

describe("routeOf / isBuilt", () => {
  it("strips query and hash", () => {
    expect(routeOf("/events/?view=past#x")).toBe("/events/");
    expect(routeOf("/apply/#eligibility")).toBe("/apply/");
  });

  it("is true for a built page, with or without the trailing slash", () => {
    expect(isBuilt("/about/team/", routes)).toBe(true);
    expect(isBuilt("/about/team", routes)).toBe(true);
    expect(isBuilt("/apply/?track=virtual#form", routes)).toBe(true);
  });

  it("treats a public file as a route, matching it exactly", () => {
    expect(isBuilt("/news/rss.xml", routes)).toBe(true);
    expect(isBuilt("/news/other.xml", routes)).toBe(false);
  });

  it("is false for a page that is not built", () => {
    expect(isBuilt("/incubation/catalyse/", routes)).toBe(false);
  });

  it("never blocks an external, mailto or tel link", () => {
    expect(isBuilt("https://www.iiserb.ac.in", routes)).toBe(true);
    expect(isBuilt("mailto:iice@iiserb.ac.in", routes)).toBe(true);
    expect(isBuilt("tel:+917552692384", routes)).toBe(true);
  });
});

describe("resolveNavigation", () => {
  it("keeps only links to built pages, drops empty groups, and drops parents left with nothing", () => {
    const resolved = resolveNavigation(nav, routes);
    expect(resolved.primary.map((i) => i.label)).toEqual(["About", "Startups"]);
    const about = resolved.primary[0]!;
    expect(about.groups).toHaveLength(1);
    expect(about.groups![0]!.links.map((l) => l.label)).toEqual(["Overview"]);
    expect(resolved.cta).toMatchObject({
      label: "Apply for Incubation",
      href: "/apply/",
      unbuilt: false,
    });
  });

  it("hides the Apply button too when /apply/ is not built", () => {
    expect(resolveNavigation(nav, new Set(["/"])).cta).toBeNull();
  });

  it("shows everything, flagged, when asked to show unbuilt pages", () => {
    const resolved = resolveNavigation(nav, routes, true);
    expect(resolved.primary.map((i) => i.label)).toEqual([
      "About",
      "Startups",
      "BIRAC Edge",
      "Incubation",
    ]);
    const about = resolved.primary[0]!;
    expect(about.groups!.flatMap((g) => g.links).map((l) => [l.label, l.unbuilt])).toEqual([
      ["Overview", false],
      ["Impact", true],
      ["Mentors", true],
    ]);
    expect(about.unbuilt).toBe(false); // it still has a built link
    expect(resolved.primary[3]!.unbuilt).toBe(true); // every link below it is unbuilt
    expect(resolved.primary[2]).toMatchObject({ label: "BIRAC Edge", unbuilt: true });
  });

  it("is empty when nothing exists", () => {
    const resolved = resolveNavigation(nav, new Set());
    expect(resolved.primary).toEqual([]);
    expect(resolved.cta).toBeNull();
  });

  it("carries link descriptions through", () => {
    const withDescription = Navigation.parse({
      primary: [
        {
          label: "A",
          groups: [
            { title: "G", links: [{ label: "L", href: "/about/", description: "About us" }] },
          ],
        },
      ],
      cta: { label: "Apply for Incubation", href: "/apply/" },
    });
    expect(
      resolveNavigation(withDescription, routes).primary[0]!.groups![0]!.links[0]!.description,
    ).toBe("About us");
  });
});

describe("resolveFooterGroups", () => {
  const groups = [
    {
      title: "A",
      links: [
        { label: "Team", href: "/about/team/" },
        { label: "Gone", href: "/gone/" },
      ],
    },
    { title: "B", links: [{ label: "Gone", href: "/gone/" }] },
    { title: "C", links: [{ label: "IISER Bhopal", href: "https://www.iiserb.ac.in" }] },
  ];

  it("keeps built and external links and drops a group with none", () => {
    const resolved = resolveFooterGroups(groups, routes);
    expect(resolved.map((g) => g.title)).toEqual(["A", "C"]);
    expect(resolved[0]!.links.map((l) => l.label)).toEqual(["Team"]);
  });

  it("keeps everything, flagged, when showing unbuilt pages", () => {
    const resolved = resolveFooterGroups(groups, routes, true);
    expect(resolved.map((g) => g.links.length)).toEqual([2, 1, 1]);
    expect(resolved[1]!.links[0]!.unbuilt).toBe(true);
  });
});

describe("current page and section", () => {
  const resolved = resolveNavigation(nav, routes);
  const about = resolved.primary[0]!;
  const startups = resolved.primary[1]!;

  it("matches a page exactly, ignoring the trailing slash and any hash", () => {
    expect(isCurrentPage("/about/team/", "/about/team")).toBe(true);
    expect(isCurrentPage("/about/team/#managing-committee", "/about/team/")).toBe(true);
    expect(isCurrentPage("/about/", "/about/team/")).toBe(false);
    expect(isCurrentPage("https://x.in/about/", "/about/")).toBe(false);
  });

  it("marks the section for any page at or below one of its links", () => {
    expect(isCurrentSection(about, "/about/")).toBe(true);
    expect(isCurrentSection(about, "/about/team/")).toBe(true);
    expect(isCurrentSection(about, "/startups/")).toBe(false);
    expect(isCurrentSection(startups, "/startups/acme/")).toBe(true);
  });

  it("does not make Home the current section of everything", () => {
    const home = { label: "Home", href: "/", unbuilt: false };
    expect(isCurrentSection(home, "/")).toBe(true);
    expect(isCurrentSection(home, "/about/")).toBe(false);
  });
});
