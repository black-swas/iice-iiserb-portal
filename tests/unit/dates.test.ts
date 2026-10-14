import { describe, expect, it } from "vitest";
import {
  daysUntil,
  endOfDayIST,
  formatDate,
  formatDateRange,
  formatDayMonth,
  formatTime,
  istDate,
  startOfDayIST,
  toMs,
} from "@/lib/dates";

describe("toMs", () => {
  it("reads a bare date as the start of that day in IST", () => {
    expect(toMs("2026-08-08")).toBe(Date.parse("2026-08-07T18:30:00Z"));
    expect(startOfDayIST("2026-08-08")).toBe(toMs("2026-08-08"));
  });

  it("reads an offset datetime as that instant", () => {
    expect(toMs("2026-08-08T10:00:00+05:30")).toBe(Date.parse("2026-08-08T04:30:00Z"));
  });

  it("accepts numbers and Dates unchanged", () => {
    expect(toMs(1_000)).toBe(1_000);
    expect(toMs(new Date(5_000))).toBe(5_000);
  });

  it("throws on text it cannot parse instead of returning NaN", () => {
    expect(() => toMs("not a date")).toThrow(/cannot parse/);
  });

  it("puts the end of day one millisecond before the next IST midnight", () => {
    expect(endOfDayIST("2026-08-08") + 1).toBe(startOfDayIST("2026-08-09"));
  });
});

describe("istDate", () => {
  it("uses the IST calendar day, not the UTC one", () => {
    expect(istDate("2026-08-07T19:00:00Z")).toBe("2026-08-08"); // 00:30 IST
    expect(istDate("2026-08-07T18:29:59Z")).toBe("2026-08-07"); // 23:59:59 IST
  });
});

describe("formatDate", () => {
  it("writes 12 Nov 2026 with the year", () => {
    expect(formatDate("2026-11-12")).toBe("12 Nov 2026");
    expect(formatDate("2026-08-08T10:00:00+05:30")).toBe("8 Aug 2026");
  });

  it("abbreviates September as Sep on every ICU version", () => {
    expect(formatDate("2026-09-05")).toBe("5 Sep 2026");
  });

  it("does not shift the day for late-evening IST times", () => {
    expect(formatDate("2026-12-31T23:30:00+05:30")).toBe("31 Dec 2026");
  });
});

describe("formatTime", () => {
  it("writes 4:30 pm IST", () => {
    expect(formatTime("2023-03-29T16:30:00+05:30")).toBe("4:30 pm IST");
  });

  it("handles midnight and noon", () => {
    expect(formatTime("2026-01-01T00:05:00+05:30")).toBe("12:05 am IST");
    expect(formatTime("2026-01-01T12:00:00+05:30")).toBe("12:00 pm IST");
  });

  it("converts from another offset", () => {
    expect(formatTime("2026-01-01T00:00:00Z")).toBe("5:30 am IST");
  });
});

describe("formatDateRange", () => {
  it("collapses a range inside one month", () => {
    expect(formatDateRange("2026-02-23", "2026-02-27")).toBe("23–27 Feb 2026");
  });

  it("keeps both months inside one year", () => {
    expect(formatDateRange("2026-02-28", "2026-03-02")).toBe("28 Feb – 2 Mar 2026");
  });

  it("keeps both years across a year end", () => {
    expect(formatDateRange("2025-12-29", "2026-01-03")).toBe("29 Dec 2025 – 3 Jan 2026");
  });

  it("gives a single date for a missing or same-day end", () => {
    expect(formatDateRange("2026-08-08")).toBe("8 Aug 2026");
    expect(formatDateRange("2026-08-08T10:00:00+05:30", "2026-08-08T17:00:00+05:30")).toBe(
      "8 Aug 2026",
    );
  });
});

describe("formatDayMonth", () => {
  const now = "2026-10-13T12:00:00+05:30";

  it("omits the year in the current year", () => {
    expect(formatDayMonth("2026-11-12", now)).toEqual({ day: "12", month: "NOV", year: null });
  });

  it("includes the year otherwise", () => {
    expect(formatDayMonth("2027-01-05", now)).toEqual({ day: "05", month: "JAN", year: "2027" });
  });
});

describe("daysUntil", () => {
  it("counts whole days", () => {
    expect(daysUntil("2026-11-30T00:00:00+05:30", "2026-11-21T00:00:00+05:30")).toBe(9);
  });

  it("rounds a part day up, so a deadline still reads 1 day until it has passed", () => {
    expect(daysUntil("2026-11-30T00:00:00+05:30", "2026-11-20T12:00:00+05:30")).toBe(10);
    expect(daysUntil("2026-11-30T00:00:00+05:30", "2026-11-29T23:59:00+05:30")).toBe(1);
  });
});
