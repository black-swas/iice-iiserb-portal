import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import { createT, interpolate, lookup, t } from "@/lib/i18n";

describe("t()", () => {
  it("returns the catalogue string for a key", () => {
    expect(t("site.name")).toBe("IICE");
    expect(t("a11y.skipToContent")).toBe("Skip to main content");
  });

  it("is the same as a translator created for the default locale", () => {
    expect(createT("en")("site.host")).toBe(t("site.host"));
  });

  it("rejects keys that are not in the catalogue at compile time", () => {
    // @ts-expect-error "site.nope" is not a MessageKey
    expect(() => t("site.nope")).toThrow(/no "site.nope" message/);
    // @ts-expect-error a branch is not a leaf, so it is not a MessageKey
    expect(() => t("site")).toThrow(/no "site" message/);
  });

  it("resolves every string leaf in en.json", () => {
    const leaves: string[] = [];
    const walk = (node: unknown, path: string[]) => {
      if (typeof node === "string") leaves.push(path.join("."));
      else if (typeof node === "object" && node !== null) {
        for (const [k, v] of Object.entries(node)) walk(v, [...path, k]);
      }
    };
    walk(en, []);
    expect(leaves.length).toBeGreaterThan(0);
    for (const key of leaves) expect(lookup(en, key)).toBeTypeOf("string");
  });
});

describe("interpolate()", () => {
  it("replaces named placeholders with strings and numbers", () => {
    expect(interpolate("Showing {current} of {total}", { current: 2, total: 6 })).toBe(
      "Showing 2 of 6",
    );
  });

  it("replaces a repeated placeholder everywhere", () => {
    expect(interpolate("{n} and {n}", { n: 1 })).toBe("1 and 1");
  });

  it("keeps a zero value rather than treating it as missing", () => {
    expect(interpolate("{n} results", { n: 0 })).toBe("0 results");
  });

  it("throws on a missing param so the build fails instead of shipping a raw placeholder", () => {
    expect(() => interpolate("Hello {name}", {}, "greeting")).toThrow(
      /"greeting" needs a value for \{name\}/,
    );
  });

  it("returns a message without placeholders unchanged", () => {
    expect(interpolate("Plain text")).toBe("Plain text");
  });
});
