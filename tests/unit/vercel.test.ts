import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { eventRedirects, REDIRECTS } from "@/content/redirects";
import { readContent } from "@/content/loaders";
import { needsRule, vercelConfig } from "@/lib/redirects";
import { CACHE_IMMUTABLE, SECURITY_HEADERS } from "@/lib/security";
import { ROOT } from "./helpers";

const content = readContent({ root: path.join(ROOT, "content"), includeDrafts: false }).content;
const events = content.collections.events.map((e) => ({
  slug: e.data.slug,
  legacyPath: e.data.legacyPath,
}));
const everyRedirect = [...REDIRECTS, ...eventRedirects(events)];
const committed = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as ReturnType<
  typeof vercelConfig
>;

describe("vercel.json", () => {
  const generated = vercelConfig(everyRedirect);

  it("builds the static export the way every other host does", () => {
    expect(committed.framework).toBeNull();
    expect(committed.buildCommand).toBe("npm run build");
    expect(committed.outputDirectory).toBe("out");
    expect(committed.trailingSlash).toBe(true);
  });

  it("carries every security header and the year-long cache for fingerprinted files, as generated", () => {
    expect(committed.headers).toEqual(generated.headers);
    const all = committed.headers.find((h) => h.source === "/(.*)");
    for (const [key, value] of SECURITY_HEADERS) {
      expect(all?.headers).toContainEqual({ key, value });
    }
    for (const source of ["/_next/static/(.*)", "/_img/(.*)"]) {
      expect(committed.headers.find((h) => h.source === source)?.headers).toEqual([
        { key: "Cache-Control", value: CACHE_IMMUTABLE },
      ]);
    }
  });

  it("redirects only old paths that are still in the table, permanently, in both forms", () => {
    const known = new Set(
      everyRedirect.filter(needsRule).flatMap((r) => [r.from, `${r.from}/`] as const),
    );
    expect(committed.redirects.length).toBeGreaterThan(0);
    for (const r of committed.redirects) {
      expect(known.has(r.source), `${r.source} is not in src/content/redirects.ts`).toBe(true);
      expect(r.permanent).toBe(true);
    }
    expect(committed.redirects.map((r) => r.source)).toContain("/about-us");
    expect(committed.redirects.map((r) => r.source)).toContain("/about-us/");
  });

  it("leaves out a path that only gained a trailing slash, which `trailingSlash` already handles", () => {
    const rules = vercelConfig([{ from: "/startups", to: "/startups/" }]).redirects;
    expect(rules).toEqual([]);
  });
});
