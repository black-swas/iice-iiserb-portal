import { afterEach, describe, expect, it, vi } from "vitest";
import { staleEntries } from "@/content/stale";
import { flaggedEntries, placeholdersIn } from "../../scripts/lib/launch";
import { BUDGETS, KB, breaches, firstLoadAssets, kb } from "../../scripts/lib/size";
import { auditedTemplates } from "../../scripts/lib/templates";
import { add, baseline, person } from "./helpers";

describe("placeholdersIn (the launch gate's page scan)", () => {
  it("finds nothing in a page without a marker", () => {
    expect(placeholdersIn("/a/", "<main><p>All confirmed.</p></main>")).toEqual([]);
  });

  it("reports visible text with the marker taken off, once, on its page", () => {
    const html = `<main><p>TODO_CONFIRM: Co-working desks</p><p>TODO_CONFIRM: Co-working desks</p><h2>TODO_CONFIRM: Mentoring</h2></main>`;
    expect(placeholdersIn("/incubation/culture/", html)).toEqual([
      { page: "/incubation/culture/", text: "Co-working desks", where: "page text" },
      { page: "/incubation/culture/", text: "Mentoring", where: "page text" },
    ]);
  });

  it("looks in the attributes that carry words, not only in text", () => {
    const html = `<main><img alt="TODO_CONFIRM: a photo of the lab" src="/x.png"/><a aria-label="TODO_CONFIRM: go" href="/x/">x</a></main>`;
    const found = placeholdersIn("/p/", html).map((p) => p.text);
    expect(found).toEqual(["a photo of the lab", "go"]);
  });

  it("finds a marker in structured data, which search engines read though visitors do not", () => {
    const html = `<head><script type="application/ld+json">{"name":"TODO_CONFIRM: Name"}</script></head>`;
    expect(placeholdersIn("/p/", html)).toEqual([
      { page: "/p/", text: "Name", where: "page source" },
    ]);
  });

  it("ignores the marker inside ordinary scripts, and says so when it is only in the page's data", () => {
    const html = `<main><p>fine</p></main><script>self.__next_f.push(["TODO_CONFIRM: hidden"])</script>`;
    expect(placeholdersIn("/p/", html)).toEqual([
      { page: "/p/", text: "(only in the page's data)", where: "page source" },
    ]);
  });

  it("shortens a long placeholder", () => {
    const long = `TODO_CONFIRM: ${"word ".repeat(60)}`;
    const [found] = placeholdersIn("/p/", `<p>${long}</p>`);
    expect(found?.text.length).toBeLessThanOrEqual(110);
    expect(found?.text.endsWith("…")).toBe(true);
  });
});

describe("flaggedEntries", () => {
  it("lists published entries that carry the flag, with the note, and leaves out drafts and clean entries", () => {
    const content = baseline();
    add(
      content,
      "people",
      person("flagged", { _status: "TODO_CONFIRM", _note: "Verify the roster." }),
    );
    add(content, "people", person("clean"));
    add(content, "people", person("draft-one", { _status: "TODO_CONFIRM", draft: true }));
    const found = flaggedEntries(content);
    expect(found).toEqual([{ file: "people/flagged.json", path: "", note: "Verify the roster." }]);
  });

  it("leaves out the figures file: a flagged figure is never shown", () => {
    const content = baseline();
    content.singletons.stats = {
      file: "stats.json",
      data: {
        items: [
          { kind: "manual", id: "x", label: "x", value: null, order: 1, _status: "TODO_CONFIRM" },
        ],
      } as never,
    };
    expect(flaggedEntries(content)).toEqual([]);
  });

  it("finds a flag on an item inside a singleton", () => {
    const content = baseline();
    content.singletons.ecosystemTiles = {
      file: "ecosystem-tiles.json",
      data: { items: [{ id: "a", _status: "TODO_CONFIRM", _note: "n" }] } as never,
    };
    expect(flaggedEntries(content)).toEqual([
      { file: "ecosystem-tiles.json", path: "items[0]", note: "n" },
    ]);
  });
});

describe("staleEntries", () => {
  const NOW = "2026-10-14T12:00:00+05:30";

  it("lists what has not been re-confirmed for more than the limit, oldest first", () => {
    const content = baseline();
    content.collections.committees[0]!.data.asOf = "2025-01-01";
    content.collections.committees[1]!.data.asOf = "2026-09-01";
    content.collections.committees[2]!.data.asOf = "2024-06-01";
    const stale = staleEntries(content, NOW);
    expect(stale.map((s) => s.file)).toEqual([
      "committees/technical-evaluation.json",
      "committees/managing.json",
    ]);
    expect(stale[0]).toMatchObject({ kind: "committee", path: "asOf", reviewed: "2024-06-01" });
    expect(stale[0]!.ageDays).toBeGreaterThan(stale[1]!.ageDays);
  });

  it("respects the limit and skips what has no date", () => {
    const content = baseline();
    content.collections.committees[0]!.data.asOf = "2026-04-01";
    expect(staleEntries(content, NOW, 180)).toHaveLength(1);
    expect(staleEntries(content, NOW, 365)).toHaveLength(0);
    expect(staleEntries(baseline(), NOW)).toEqual([]);
  });
});

describe("size: first-load assets", () => {
  const html = `<!DOCTYPE html><html><head>
    <link rel="stylesheet" href="/_next/static/chunks/a.css" data-precedence="next"/>
    <link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/b.js"/>
    <link rel="preload" as="font" href="/_next/static/media/f.woff2" crossorigin=""/>
    <script src="/_next/static/chunks/c.js" async=""></script>
    <script src="/_next/static/chunks/b.js" async=""></script>
    <script src="/_next/static/chunks/poly.js" nomodule=""></script>
    <script>inline()</script>
  </head></html>`;

  it("counts the scripts a modern browser runs, once each, and leaves out nomodule polyfills", () => {
    const assets = firstLoadAssets(html, "iice.iiserb.ac.in");
    expect([...assets.scripts].sort()).toEqual([
      "/_next/static/chunks/b.js",
      "/_next/static/chunks/c.js",
    ]);
    expect(assets.styles).toEqual(["/_next/static/chunks/a.css"]);
    expect(assets.fonts).toEqual(["/_next/static/media/f.woff2"]);
    expect(assets.thirdParty).toEqual([]);
  });

  it("notes a request to another site, including a preconnect", () => {
    const external = `<head><script src="https://cdn.example.net/x.js"></script><link rel="preconnect" href="https://fonts.gstatic.com"/><link rel="stylesheet" href="https://other.test/a.css"/><script src="https://iice.iiserb.ac.in/own.js"></script></head>`;
    const assets = firstLoadAssets(external, "iice.iiserb.ac.in");
    expect(assets.thirdParty.sort()).toEqual([
      "cdn.example.net",
      "fonts.gstatic.com",
      "other.test",
    ]);
    expect(assets.scripts).toEqual([]);
  });
});

describe("size: budgets", () => {
  const ok = {
    route: "/about/",
    jsBytes: 170 * KB,
    cssBytes: 13 * KB,
    fontBytes: 0,
    fontFiles: 0,
    thirdParty: [],
  };

  it("have the raised JS ceilings and the original CSS and font limits (TRD §12)", () => {
    expect(BUDGETS.homeJs).toBe(430 * KB);
    expect(BUDGETS.pageJs).toBe(400 * KB);
    expect(BUDGETS.css).toBe(35 * KB);
    expect(BUDGETS.fontBytes).toBe(120 * KB);
    expect(BUDGETS.fontFiles).toBe(4);
  });

  it("pass what is within them", () => {
    expect(breaches(ok)).toEqual([]);
    expect(breaches({ ...ok, route: "/", jsBytes: 429 * KB })).toEqual([]);
  });

  it("hold the home page to its own ceiling, which is higher than other pages'", () => {
    expect(breaches({ ...ok, jsBytes: 401 * KB }).map((b) => b.rule)).toEqual([
      "initial JS (gzip)",
    ]);
    expect(breaches({ ...ok, route: "/", jsBytes: 401 * KB })).toEqual([]);
    expect(breaches({ ...ok, route: "/", jsBytes: 431 * KB })).toHaveLength(1);
  });

  it("name each budget that is broken", () => {
    const rules = breaches({ ...ok, cssBytes: 36 * KB, fontBytes: 130 * KB, fontFiles: 5 }).map(
      (b) => b.rule,
    );
    expect(rules).toEqual(["CSS (gzip)", "fonts (bytes)", "font files"]);
  });

  it("print sizes the way people read them", () => {
    expect(kb(1536)).toBe("1.5 KB");
  });
});

describe("audited templates", () => {
  it("keeps the fixed templates that exist and one page of each collection kind", () => {
    const built = [
      "/",
      "/about/",
      "/apply/",
      "/startups/",
      "/startups/zeta/",
      "/startups/alpha/",
      "/events/",
      "/events/e1/",
      "/news/",
      "/documents/",
    ];
    expect(auditedTemplates(built)).toEqual([
      "/",
      "/about/",
      "/apply/",
      "/startups/",
      "/events/",
      "/news/",
      "/documents/",
      "/events/e1/",
      "/startups/alpha/",
    ]);
  });

  it("does not list a template that was not built", () => {
    expect(auditedTemplates(["/", "/apply/"])).toEqual(["/", "/apply/"]);
  });
});

describe("the launch switch for placeholder markers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("strips the marker by default and keeps it only for the launch check's own build", async () => {
    const normal = await import("@/content/todo");
    expect(normal.display("TODO_CONFIRM: Co-working desks")).toBe("Co-working desks");

    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_KEEP_TODO", "1");
    const keeping = await import("@/content/todo");
    expect(keeping.display("TODO_CONFIRM: Co-working desks")).toBe(
      "TODO_CONFIRM: Co-working desks",
    );
    expect(keeping.displayDeep({ a: ["TODO_CONFIRM: x"] })).toEqual({ a: ["TODO_CONFIRM: x"] });
  });
});
