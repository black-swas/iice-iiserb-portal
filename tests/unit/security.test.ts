import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { analyticsConfig } from "@/lib/analytics";
import { headersFile, htaccess, nginx } from "@/lib/redirects";
import {
  SECURITY_HEADERS,
  VIDEO_ORIGIN,
  buildPolicy,
  endpointOrigins,
  injectPolicy,
  inlineScriptHashes,
  originOf,
} from "@/lib/security";

const sha = (text: string) =>
  `sha256-${createHash("sha256").update(text, "utf8").digest("base64")}`;

const page = (scripts: string, head = "") =>
  `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width"/>${head}${scripts}</head><body></body></html>`;

describe("inlineScriptHashes", () => {
  it("hashes the exact text of each inline script, once", () => {
    const html = page(
      `<script>var a=1</script><script id="x">self.__next_f.push([0])</script><script>var a=1</script>`,
    );
    expect(inlineScriptHashes(html)).toEqual([sha("var a=1"), sha("self.__next_f.push([0])")]);
  });

  it("leaves out scripts loaded from a file, and data blocks the browser never runs", () => {
    const html = page(
      `<script src="/a.js" async=""></script><script type="application/ld+json">{"a":1}</script><script type="application/json">{}</script>`,
    );
    expect(inlineScriptHashes(html)).toEqual([]);
  });

  it("keeps whitespace, because the browser hashes it", () => {
    expect(inlineScriptHashes(page("<script> x </script>"))).toEqual([sha(" x ")]);
  });
});

describe("buildPolicy", () => {
  const policy = buildPolicy({ scriptHashes: ["sha256-AAA="] });
  const directive = (name: string) =>
    policy
      .split("; ")
      .find((d) => d.startsWith(`${name} `))
      ?.slice(name.length + 1);

  it("blocks everything it does not name", () => {
    expect(directive("default-src")).toBe("'self'");
    expect(directive("object-src")).toBe("'none'");
    expect(directive("base-uri")).toBe("'self'");
  });

  it("allows this page's inline scripts by hash, and no other inline script", () => {
    expect(directive("script-src")).toBe("'self' 'sha256-AAA='");
    expect(policy).not.toContain("'unsafe-inline' ");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("allows inline style attributes only, not style elements", () => {
    expect(directive("style-src")).toBe("'self'");
    expect(directive("style-src-attr")).toBe("'unsafe-inline'");
  });

  it("allows video only from the privacy-enhanced host", () => {
    expect(directive("frame-src")).toBe(VIDEO_ORIGIN);
  });

  it("adds exactly the origins the build is configured with", () => {
    const p = buildPolicy({
      scriptHashes: [],
      scriptOrigins: ["https://plausible.io"],
      connectOrigins: ["https://script.google.com", "https://plausible.io"],
      frameOrigins: ["https://www.google.com"],
      formOrigins: ["https://script.google.com"],
    });
    expect(p).toContain("script-src 'self' https://plausible.io");
    expect(p).toContain("connect-src 'self' https://script.google.com https://plausible.io");
    expect(p).toContain(`frame-src ${VIDEO_ORIGIN} https://www.google.com`);
    expect(p).toContain("form-action 'self' https://script.google.com");
  });

  it("never lists an origin twice", () => {
    const p = buildPolicy({
      scriptHashes: [],
      connectOrigins: ["https://a.test", "https://a.test"],
    });
    expect(p.match(/https:\/\/a\.test/g)).toHaveLength(1);
  });
});

describe("injectPolicy", () => {
  const policy = "default-src 'self'; script-src 'self' 'sha256-AAA='";

  it("puts the policy in the head right after the charset, before anything it must govern", () => {
    const out = injectPolicy(page("<script>x</script>"), policy);
    const metaAt = out.indexOf('http-equiv="content-security-policy"');
    expect(metaAt).toBeGreaterThan(out.indexOf("charSet"));
    expect(metaAt).toBeLessThan(out.indexOf('name="viewport"'));
    expect(metaAt).toBeLessThan(out.indexOf("<script>"));
  });

  it("replaces a policy that is already there, so the step is safe to run twice", () => {
    const once = injectPolicy(page(""), policy);
    const twice = injectPolicy(once, "default-src 'none'");
    expect(twice.match(/http-equiv="content-security-policy"/g)).toHaveLength(1);
    expect(twice).toContain("default-src 'none'");
    expect(twice).not.toContain("sha256-AAA=");
  });

  it("escapes quotes so a policy cannot break out of the attribute", () => {
    const out = injectPolicy(page(""), `x "y"`);
    expect(out).toContain('content="x &quot;y&quot;"');
  });

  it("falls back to the head when there is no charset, and leaves a page without a head alone", () => {
    expect(injectPolicy("<html><head></head></html>", policy)).toContain("<head><meta http-equiv=");
    expect(injectPolicy("<p>fragment</p>", policy)).toBe("<p>fragment</p>");
  });
});

describe("origins", () => {
  it("reads the origin of an http or https address, and nothing else", () => {
    expect(originOf("https://script.google.com/macros/s/x/exec")).toBe("https://script.google.com");
    expect(originOf("http://localhost:4175/a")).toBe("http://localhost:4175");
    expect(originOf("mailto:a@b.co")).toBeUndefined();
    expect(originOf("not a url")).toBeUndefined();
    expect(originOf(undefined)).toBeUndefined();
  });

  it("adds the host Apps Script redirects to, since a policy is checked where a request ends up", () => {
    expect(endpointOrigins("https://script.google.com/macros/s/x/exec")).toEqual([
      "https://script.google.com",
      "https://script.googleusercontent.com",
    ]);
    expect(endpointOrigins("https://forms.example.in/send")).toEqual(["https://forms.example.in"]);
    expect(endpointOrigins("")).toEqual([]);
  });
});

describe("analytics configuration", () => {
  it("is off unless a cookieless provider and its id are set", () => {
    expect(analyticsConfig({})).toBeNull();
    expect(analyticsConfig({ provider: "none", id: "x" })).toBeNull();
    expect(analyticsConfig({ provider: "plausible" })).toBeNull();
  });

  it("refuses GA4, which would track without a consent banner", () => {
    expect(analyticsConfig({ provider: "ga4", id: "G-XXXX" })).toBeNull();
  });

  it("configures Plausible and Umami, with their own host when self-hosted", () => {
    expect(analyticsConfig({ provider: "plausible", id: "iice.iiserb.ac.in" })).toEqual({
      provider: "plausible",
      script: "https://plausible.io/js/script.js",
      attributes: { "data-domain": "iice.iiserb.ac.in" },
      origin: "https://plausible.io",
    });
    expect(
      analyticsConfig({ provider: "Umami", id: "abc", host: "https://stats.iiserb.ac.in/" }),
    ).toEqual({
      provider: "umami",
      script: "https://stats.iiserb.ac.in/script.js",
      attributes: { "data-website-id": "abc" },
      origin: "https://stats.iiserb.ac.in",
    });
  });

  it("ignores a host that is not a web address", () => {
    expect(analyticsConfig({ provider: "umami", id: "abc", host: "nonsense" })).toBeNull();
  });
});

describe("security headers in the host files", () => {
  const names = SECURITY_HEADERS.map(([name]) => name);

  it("covers the headers TRD §14 names", () => {
    for (const name of [
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy",
      "X-Frame-Options",
    ])
      expect(names).toContain(name);
    expect(SECURITY_HEADERS.find(([n]) => n === "Content-Security-Policy")?.[1]).toBe(
      "frame-ancestors 'none'",
    );
  });

  it("writes every header in Apache, Nginx and static-host format", () => {
    const apache = htaccess([]);
    const ngx = nginx([]);
    const hosted = headersFile();
    for (const [name, value] of SECURITY_HEADERS) {
      expect(apache).toContain(`Header always set ${name} "${value}"`);
      expect(ngx).toContain(`add_header ${name} "${value}" always;`);
      expect(hosted).toContain(`  ${name}: ${value}`);
    }
  });

  it("repeats the headers inside each Nginx caching location, which would otherwise drop them", () => {
    const ngx = nginx([]);
    const blocks = ngx.split("location ~ ").slice(1);
    expect(blocks).toHaveLength(2);
    for (const block of blocks)
      for (const [name] of SECURITY_HEADERS) expect(block).toContain(`add_header ${name} `);
  });

  it("caches fingerprinted files for a year and pages for minutes, in every format", () => {
    for (const text of [htaccess([]), nginx([]), headersFile()]) {
      expect(text).toContain("max-age=31536000, immutable");
    }
    expect(htaccess([])).toContain("max-age=300, must-revalidate");
  });
});
