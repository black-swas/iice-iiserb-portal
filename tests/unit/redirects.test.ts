import { describe, expect, it } from "vitest";
import { activeRedirects, eventRedirects, REDIRECTS, targetRoute } from "@/content/redirects";
import { COLLECTION_ROUTES, PAGE_ROUTES } from "@/content/page-routes";
import { readContent } from "@/content/loaders";
import { htaccess, needsRule, nginx, redirectsFile, stubHtml } from "@/lib/redirects";
import path from "node:path";
import { ROOT } from "./helpers";

const content = readContent({ root: path.join(ROOT, "content"), includeDrafts: false }).content;
const fixedRoutes = new Set(["/", ...PAGE_ROUTES.map((r) => r.path)]);
const events = content.collections.events.map((e) => ({
  slug: e.data.slug,
  legacyPath: e.data.legacyPath,
}));

describe("the legacy redirect table", () => {
  it("only points at pages the site can build", () => {
    const eventRoutes = new Set(events.map((e) => `/events/${e.slug}/`));
    for (const r of [...REDIRECTS, ...eventRedirects(events)]) {
      const route = targetRoute(r.to);
      expect(fixedRoutes.has(route) || eventRoutes.has(route), `${r.from} → ${r.to}`).toBe(true);
    }
  });

  it("uses old paths without a trailing slash, each once", () => {
    const sources = [...REDIRECTS, ...eventRedirects(events)].map((r) => r.from);
    for (const from of sources) expect(from.startsWith("/") && !from.endsWith("/")).toBe(true);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("covers every event's own legacy address", () => {
    const withLegacy = events.filter((e) => e.legacyPath);
    expect(withLegacy.length).toBeGreaterThan(0);
    expect(eventRedirects(events)).toHaveLength(withLegacy.length);
    expect(eventRedirects([{ slug: "x", legacyPath: "/activities/x/" }])).toEqual([
      { from: "/activities/x", to: "/events/x/" },
    ]);
  });

  it("covers the whole SRD list", () => {
    const sources = new Set(REDIRECTS.map((r) => r.from));
    for (const old of [
      "/home",
      "/about-us",
      "/about-us/team",
      "/activities/past-events",
      "/docs/application-form",
    ]) {
      expect(sources.has(old), old).toBe(true);
    }
  });

  it("keeps the committee anchors that the team tabs answer to", () => {
    const team = REDIRECTS.filter((r) => r.to.startsWith("/about/team/#")).map(
      (r) => r.to.split("#")[1],
    );
    expect(team).toEqual([
      "committees",
      "managing-committee",
      "executive-committee",
      "technical-evaluation-committee",
      "management-advisory-committee",
    ]);
  });
});

describe("activeRedirects", () => {
  it("leaves out a redirect whose target is not built", () => {
    const { active, skipped } = activeRedirects([], (route) => route !== "/documents/");
    expect(skipped.map((r) => r.from)).toEqual([
      "/about-us/resolutions",
      "/about-us/incubation-policy",
    ]);
    expect(active.some((r) => r.to.startsWith("/documents/"))).toBe(false);
  });
});

describe("generated files", () => {
  const sample = [
    { from: "/about-us", to: "/about/" },
    { from: "/startups", to: "/startups/" },
    { from: "/activities/past-events", to: "/events/?view=past" },
  ];

  it("skips a path that only gained a slash, which every server already handles and which would loop", () => {
    expect(needsRule(sample[1] as { from: string; to: string })).toBe(false);
    for (const text of [htaccess(sample), nginx(sample), redirectsFile(sample)]) {
      expect(text).not.toMatch(
        /\/startups\/? \/startups\/ 301|\^\/startups\/\$ "\/startups\/"|= \/startups\/? \{/,
      );
    }
  });

  it("writes both forms of each old path for Apache, Nginx and static hosts", () => {
    expect(htaccess(sample)).toContain('RedirectMatch 301 ^/about-us$ "/about/"');
    expect(htaccess(sample)).toContain('RedirectMatch 301 ^/about-us/$ "/about/"');
    expect(htaccess(sample)).toContain("ErrorDocument 404 /404.html");
    expect(nginx(sample)).toContain("location = /about-us { return 301 /about/; }");
    expect(nginx(sample)).toContain("error_page 404 /404.html;");
    expect(redirectsFile(sample)).toContain("/about-us /about/ 301");
    expect(redirectsFile(sample)).toContain("/activities/past-events/ /events/?view=past 301");
  });

  it("caches fingerprinted assets for a year and pages for minutes", () => {
    expect(htaccess([])).toContain("immutable");
    expect(nginx([])).toContain("max-age=31536000, immutable");
    expect(nginx([])).toContain("max-age=300");
  });

  it("writes a stub with a refresh, a canonical link and a visible link", () => {
    const html = stubHtml(
      { from: "/about-us", to: "/about/" },
      { url: "https://iice.iiserb.ac.in", name: "IICE" },
    );
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/about/">');
    expect(html).toContain('<link rel="canonical" href="https://iice.iiserb.ac.in/about/">');
    expect(html).toContain('<a href="/about/">');
    expect(html).toContain('name="robots" content="noindex"');
  });
});

describe("collection routes", () => {
  it("name every collection prefix once", () => {
    const prefixes = COLLECTION_ROUTES.map((r) => r.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});
