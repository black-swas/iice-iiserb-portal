import { describe, expect, it } from "vitest";
import { formatINR, formatMoney, formatNumber, formatStat } from "@/lib/money";

describe("formatINR", () => {
  it.each([
    [0, "₹0"],
    [999, "₹999"],
    [75_000, "₹75,000"],
    [100_000, "₹1 lakh"],
    [150_000, "₹1.5 lakh"],
    [1_000_000, "₹10 lakh"],
    [2_500_000, "₹25 lakh"],
    [10_000_000, "₹1 crore"],
    [12_500_000, "₹1.25 crore"],
    [15_000_000, "₹1.5 crore"],
  ])("formats %d as %s", (amount, expected) => {
    expect(formatINR(amount)).toBe(expected);
  });

  it("falls back to digits when a lakh form would round the value", () => {
    expect(formatINR(123_456)).toBe("₹1,23,456");
    expect(formatINR(12_345_678)).toBe("₹1,23,45,678");
  });

  it("never writes the spellings the audited sites mixed", () => {
    for (const amount of [100_000, 1_000_000, 25_000_000]) {
      expect(formatINR(amount)).not.toMatch(/lakhs|lacs?\b|\d+L\b/i);
    }
  });

  it("rejects amounts it cannot honestly format", () => {
    expect(() => formatINR(-1)).toThrow(RangeError);
    expect(() => formatINR(Number.NaN)).toThrow(RangeError);
    expect(() => formatINR(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("is null when both ends are unknown, so the caller shows 'To be announced'", () => {
    expect(formatMoney({ min: null, max: null })).toBeNull();
  });

  it("writes a ceiling, a floor and a single amount", () => {
    expect(formatMoney({ min: null, max: 2_500_000 })).toBe("Up to ₹25 lakh");
    expect(formatMoney({ min: 300_000, max: null })).toBe("From ₹3 lakh");
    expect(formatMoney({ min: 1_000_000, max: 1_000_000 })).toBe("₹10 lakh");
  });

  it("shares the unit when both ends use it", () => {
    expect(formatMoney({ min: 500_000, max: 1_000_000 })).toBe("₹5–10 lakh");
    expect(formatMoney({ min: 10_000_000, max: 20_000_000 })).toBe("₹1–2 crore");
  });

  it("spells out both ends when the units differ or are plain digits", () => {
    expect(formatMoney({ min: 5_000_000, max: 10_000_000 })).toBe("₹50 lakh–₹1 crore");
    expect(formatMoney({ min: 5_000, max: 10_000 })).toBe("₹5,000–₹10,000");
  });
});

describe("formatNumber", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [10_000, "10,000"],
    [1_234_567, "12,34,567"],
    [12.5, "12.5"],
    [-1_234, "-1,234"],
  ])("formats %d as %s", (n, expected) => {
    expect(formatNumber(n)).toBe(expected);
  });
});

describe("formatStat", () => {
  it("adds the unit", () => {
    expect(formatStat({ value: 10_000, unit: "sqft" })).toBe("10,000 sq ft");
    expect(formatStat({ value: 1_200, unit: "hours" })).toBe("1,200 hours");
    expect(formatStat({ value: 45, unit: "percent" })).toBe("45%");
    expect(formatStat({ value: 2_00_00_000, unit: "inr" })).toBe("₹2 crore");
  });

  it("writes the plus once, never twice", () => {
    expect(formatStat({ value: 600, unit: "count", plus: true })).toBe("600+");
    expect(formatStat({ value: 10_000, unit: "sqft", plus: true })).toBe("10,000+ sq ft");
    expect(formatStat({ value: 600, unit: "count", plus: true })).not.toContain("++");
  });
});
