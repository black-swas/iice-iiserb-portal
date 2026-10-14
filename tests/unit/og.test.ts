import { describe, expect, it } from "vitest";
import { OG_HEIGHT, OG_WIDTH, ogSvg, splitName } from "@/lib/og";
import { t } from "@/lib/i18n";

describe("splitName", () => {
  it("splits at the space nearest the middle, so neither line runs off the card", () => {
    expect(splitName("Innovation and Incubation Centre for Entrepreneurship")).toEqual([
      "Innovation and Incubation",
      "Centre for Entrepreneurship",
    ]);
  });
  it("leaves one word on one line", () => {
    expect(splitName("IICE")).toEqual(["IICE", ""]);
  });
});

describe("ogSvg", () => {
  const svg = ogSvg({
    name: "IICE",
    fullName: "Innovation and Incubation Centre for Entrepreneurship",
    host: "IISER Bhopal",
  });

  it("is a 1200 by 630 card carrying the site's names", () => {
    expect(svg).toContain(`width="${OG_WIDTH}" height="${OG_HEIGHT}"`);
    for (const text of [
      "IICE",
      "Innovation and Incubation",
      "Centre for Entrepreneurship",
      "IISER Bhopal",
    ]) {
      expect(svg).toContain(text);
    }
  });

  it("uses only the interim brand colours, amber for accents and white for text", () => {
    const colours = new Set(svg.match(/#[0-9a-f]{6}/gi)?.map((c) => c.toLowerCase()));
    expect([...colours].sort()).toEqual(["#082f3b", "#0b4f63", "#f2a541", "#ffffff"]);
  });

  it("escapes what it is given", () => {
    expect(ogSvg({ name: "A&B", fullName: "x <y>", host: "z" })).toContain("A&amp;B");
  });

  it("is made from the catalogue's own words", () => {
    const card = ogSvg({
      name: t("site.name"),
      fullName: t("site.fullName"),
      host: t("site.host"),
    });
    expect(card).toContain("Entrepreneurship");
  });
});
