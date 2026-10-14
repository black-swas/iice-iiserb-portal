import { describe, expect, it } from "vitest";
import { auditCss, auditHtml, idsOf } from "../../scripts/lib/audit-html";

const options = {
  siteHost: "iice.iiserb.ac.in",
  pathExists: (p: string) => ["/about/", "/files/a.pdf", "/og/default.png"].includes(p),
};

/** A minimal good page, with `body` inside <main>. */
const page = (body: string, head = "") =>
  `<!doctype html><html lang="en"><head><title>T</title><meta name="description" content="D"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://iice.iiserb.ac.in/x/"><meta property="og:image" content="https://iice.iiserb.ac.in/og/default.png">${head}</head><body><main><h1>Heading</h1>${body}</main></body></html>`;

const rulesFor = (html: string, extra = {}) =>
  auditHtml([{ file: "x/index.html", html }], { ...options, ...extra }).map((f) => f.rule);

describe("auditHtml", () => {
  it("passes a clean page", () => {
    expect(rulesFor(page('<p><a href="/about/">About us</a></p>'))).toEqual([]);
  });

  it("flags dead and unnamed links", () => {
    expect(rulesFor(page('<a href="#">Go</a>'))).toContain('anchor with href="#"');
    expect(rulesFor(page("<a>Go</a>"))).toContain("anchor without href");
    expect(rulesFor(page('<a href="/about/"></a>'))).toContain("link has no accessible name");
    expect(rulesFor(page('<a href="/about/">Read more</a>'))).toContain(
      'generic link text "Read more"',
    );
  });

  it("accepts a generic word when an aria-label says more", () => {
    expect(
      rulesFor(page('<a href="/about/" aria-label="Learn more about IICE">Learn more</a>')),
    ).toEqual([]);
  });

  it("checks anchors and site paths", () => {
    expect(rulesFor(page('<a href="#nope">Jump</a>'))).toContain(
      'anchor points at missing id "nope"',
    );
    expect(rulesFor(page('<a href="#here">Jump</a><h2 id="here">Here</h2>'))).toEqual([]);
    expect(rulesFor(page('<a href="/missing/">Gone</a>'))).toContain(
      "link to a page or file that is not in the build",
    );
    expect(rulesFor(page('<a href="/files/a.pdf">A file</a>'))).toEqual([]);
  });

  it("checks mailto and external links", () => {
    expect(rulesFor(page('<a href="mailto:bad">Mail</a>'))).toContain("malformed mailto: link");
    expect(rulesFor(page('<a href="mailto:?subject=x">Share</a>'))).toEqual([]);
    expect(rulesFor(page('<a href="https://x.vercel.app/a">Preview</a>'))).toContain(
      "link to a preview or local host (x.vercel.app)",
    );
    expect(rulesFor(page('<a href="https://example.org/" target="_blank">Other</a>'))).toContain(
      'target="_blank" without rel="noopener"',
    );
  });

  it("flags buttons that may do nothing", () => {
    expect(rulesFor(page("<button>Go</button>"))).toContain(
      "button without type=submit or a data-action marker (it may do nothing)",
    );
    expect(rulesFor(page('<button type="button" data-action="x">Go</button>'))).toEqual([]);
    expect(rulesFor(page('<form><button type="submit">Send</button></form>'))).toEqual([]);
  });

  it("flags poor alt text", () => {
    expect(rulesFor(page('<img src="/a.png">'))).toContain("image without alt");
    expect(rulesFor(page('<img src="/a.png" alt="logo">'))).toContain(
      'alt text "logo" does not describe the image',
    );
    expect(rulesFor(page('<img src="/a.png" alt="IMG_1234.jpg">'))).toContain(
      'alt text "IMG_1234.jpg" does not describe the image',
    );
    expect(rulesFor(page('<img src="/a.png" alt="1234">'))).toContain(
      'alt text "1234" does not describe the image',
    );
    expect(rulesFor(page('<img src="/a.png" alt="">'))).toContain(
      'alt="" without role="presentation"',
    );
    expect(rulesFor(page('<img src="/a.png" alt="" role="presentation">'))).toEqual([]);
    expect(rulesFor(page('<img src="/a.png" alt="The IICE lab bench">'))).toEqual([]);
  });

  it("flags hot-linked images and first-load requests to other sites", () => {
    expect(
      rulesFor(page('<img src="https://lh3.googleusercontent.com/x" alt="A real description">')),
    ).toContain("image hosted on another site");
    expect(
      rulesFor(page("", '<link rel="stylesheet" href="https://fonts.googleapis.com/css">')),
    ).toContain("first-load request to another site");
  });

  it("checks headings", () => {
    expect(rulesFor(page("<h3>Skipped</h3>"))).toContain("heading level skips from h1 to h3");
    expect(rulesFor(page("<h2>Fine</h2><h3>Fine</h3>"))).toEqual([]);
    expect(rulesFor(page("<h1>Second</h1>"))).toContain("expected 1 h1, found 2");
    expect(rulesFor(page("<h2></h2>"))).toContain("empty heading");
  });

  it("checks frames and form controls", () => {
    expect(rulesFor(page('<iframe src="/x"></iframe>'))).toContain("iframe without title");
    expect(rulesFor(page('<input type="text" name="a">'))).toContain(
      "form control without a label",
    );
    expect(rulesFor(page('<label for="a">Name</label><input id="a" type="text">'))).toEqual([]);
    expect(rulesFor(page('<label>Name <input type="text"></label>'))).toEqual([]);
    expect(rulesFor(page('<input type="hidden" name="a">'))).toEqual([]);
  });

  it("flags counters that show nothing or zero", () => {
    expect(rulesFor(page('<p data-stat="a">0</p>'))).toContain('counter shows "0"');
    expect(rulesFor(page('<p data-stat="a"></p>'))).toContain('counter shows ""');
    expect(rulesFor(page('<p data-stat="a">10,000 sq ft</p>'))).toEqual([]);
  });

  it("flags forbidden copy, and TODO_CONFIRM unless allowed", () => {
    expect(rulesFor(page("<p>Lorem ipsum text</p>")).length).toBeGreaterThan(0);
    expect(rulesFor(page("<p>Coming soon</p>"))).toContain(
      "forbidden copy matching /coming soon/i",
    );
    expect(rulesFor(page("<p>TODO_CONFIRM: x</p>"))).toContain(
      "TODO_CONFIRM marker in the page (a placeholder that display() should have stripped)",
    );
    expect(rulesFor(page("<p>TODO_CONFIRM: x</p>"), { allowTodo: true })).toEqual([]);
    // Words inside scripts are not copy.
    expect(rulesFor(page("<script>var lorem = 1</script>"))).toEqual([]);
  });

  it("flags a viewport that blocks zoom, and a missing language, description or main", () => {
    expect(
      rulesFor(
        page("").replace("initial-scale=1", "initial-scale=1, maximum-scale=1, user-scalable=no"),
      ),
    ).toContain("viewport blocks zoom");
    expect(rulesFor(page("<p>x</p>").replace('lang="en"', ""))).toContain("missing lang attribute");
    expect(
      rulesFor(page("<p>x</p>").replace('<meta name="description" content="D">', "")),
    ).toContain("missing meta description");
  });

  it("flags a page without a canonical link or a sharing image, or with one that is not built", () => {
    const bare = page("<p>x</p>");
    expect(rulesFor(bare.replace(/<link rel="canonical"[^>]*>/, ""))).toContain(
      "missing canonical link",
    );
    expect(rulesFor(bare.replace(/<meta property="og:image"[^>]*>/, ""))).toContain(
      "missing Open Graph image",
    );
    expect(rulesFor(bare.replace("/og/default.png", "/og/gone.png"))).toContain(
      "Open Graph image /og/gone.png is not in the build",
    );
    // An image on another site is not ours to check here.
    expect(
      rulesFor(
        bare.replace("https://iice.iiserb.ac.in/og/default.png", "https://cdn.other.test/x.png"),
      ),
    ).toEqual([]);
  });

  it("does not ask the 404 page to be indexed or shared", () => {
    const bare = page("<p>x</p>")
      .replace(/<link rel="canonical"[^>]*>/, "")
      .replace(/<meta property="og:image"[^>]*>/, "");
    const findings = auditHtml([{ file: "404.html", html: bare }], options).map((f) => f.rule);
    expect(findings).toEqual([]);
  });

  it("flags duplicate ids", () => {
    expect(rulesFor(page('<p id="a">x</p><p id="a">y</p>'))).toContain('duplicate id "a"');
  });

  it("flags titles and descriptions that two pages share", () => {
    const findings = auditHtml(
      [
        { file: "a/index.html", html: page("<p>a</p>") },
        { file: "b/index.html", html: page("<p>b</p>") },
      ],
      options,
    );
    expect(findings.filter((f) => f.rule.startsWith("duplicate title")).map((f) => f.file)).toEqual(
      ["a/index.html", "b/index.html"],
    );
    expect(findings.some((f) => f.rule.startsWith("duplicate description"))).toBe(true);
  });

  it("checks that an anchor on another page exists there", () => {
    const pages = [
      {
        file: "a/index.html",
        html: page(
          '<a href="/b/#team">Team</a><a href="/b/#gone">Gone</a>',
          "<title>A</title>",
        ).replace("<title>T</title>", ""),
      },
      {
        file: "b/index.html",
        html: page('<h2 id="team">Team</h2>')
          .replace("<title>T</title>", "<title>B</title>")
          .replace('content="D"', 'content="Other"'),
      },
    ];
    const rules = auditHtml(pages, { ...options, pathExists: () => true }).map((f) => f.rule);
    expect(rules).toContain('link to missing anchor "#gone" on /b/');
    expect(rules.some((r) => r.includes('"#team"'))).toBe(false);
  });

  it("ignores redirect stubs", () => {
    const stub =
      '<!doctype html><html lang="en"><head><meta http-equiv="refresh" content="0; url=/about/"></head><body><a href="/about/">Go</a></body></html>';
    expect(auditHtml([{ file: "old/index.html", html: stub }], options)).toEqual([]);
  });

  it("collects the ids of a page", () => {
    expect([...idsOf('<div id="a"><p id="b"></p></div>')].sort()).toEqual(["a", "b"]);
  });
});

describe("auditCss", () => {
  it("flags hidden scrollbars", () => {
    expect(auditCss("a.css", ".x{scrollbar-width:none}")).toHaveLength(1);
    expect(auditCss("a.css", ".x::-webkit-scrollbar{display:none}")).toHaveLength(1);
    expect(auditCss("a.css", ".x{overflow:auto}")).toEqual([]);
  });
});
