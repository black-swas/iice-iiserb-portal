import { describe, expect, it } from "vitest";
import { closingHint, sortCalls, tabOf } from "@/lib/opportunities";
import type { WindowLike } from "@/lib/status";

const NOW = "2026-10-14T12:00:00+05:30";
const call = (slug: string, window: WindowLike) => ({ slug, window });

const open30 = call("closes-in-30", {
  opensAt: "2026-10-01T00:00:00+05:30",
  closesAt: "2026-11-13T23:59:00+05:30",
});
const open5 = call("closes-in-5", {
  opensAt: "2026-10-01T00:00:00+05:30",
  closesAt: "2026-10-19T23:59:00+05:30",
});
const openEnded = call("open-ended", { opensAt: "2026-09-01T00:00:00+05:30" });
const rolling = call("rolling", { rolling: true });
const soon = call("soon", {
  opensAt: "2026-12-01T00:00:00+05:30",
  closesAt: "2026-12-31T23:59:00+05:30",
});
const later = call("later", { opensAt: "2027-02-01T00:00:00+05:30" });
const tba = call("tba", {});
const closedRecent = call("closed-recent", { closesAt: "2026-09-30T23:59:00+05:30" });
const closedOld = call("closed-old", { closesAt: "2025-03-01T23:59:00+05:30" });

describe("tabOf", () => {
  it("puts every call a visitor may still act on under Open", () => {
    for (const c of [open30, openEnded, rolling, soon, tba])
      expect(tabOf(c, NOW), c.slug).toBe("open");
  });
  it("puts only a call whose window has closed under Past", () => {
    for (const c of [closedRecent, closedOld]) expect(tabOf(c, NOW), c.slug).toBe("past");
  });
  it("moves a call to Past the moment it closes, whatever the build said", () => {
    expect(tabOf(open5, "2026-10-19T23:58:00+05:30")).toBe("open");
    expect(tabOf(open5, "2026-10-19T23:59:00+05:30")).toBe("past");
  });
});

describe("sortCalls", () => {
  it("orders open calls by deadline, then open-ended, rolling, not yet open (by date), then undated", () => {
    const sorted = sortCalls([tba, later, rolling, soon, openEnded, open30, open5], NOW);
    expect(sorted.map((c) => c.slug)).toEqual([
      "closes-in-5",
      "closes-in-30",
      "open-ended",
      "rolling",
      "soon",
      "later",
      "tba",
    ]);
  });

  it("orders past calls with the most recently closed first", () => {
    expect(sortCalls([closedOld, closedRecent], NOW).map((c) => c.slug)).toEqual([
      "closed-recent",
      "closed-old",
    ]);
  });

  it("does not change the list it is given", () => {
    const input = [open30, open5];
    sortCalls(input, NOW);
    expect(input.map((c) => c.slug)).toEqual(["closes-in-30", "closes-in-5"]);
  });
});

describe("closingHint", () => {
  it("counts the days left on an open call with a deadline", () => {
    expect(closingHint(open5.window, NOW)).toEqual({ kind: "days", days: 6 });
    expect(closingHint(open30.window, NOW)).toEqual({ kind: "days", days: 31 });
  });
  it("says 'within a day' for the last day", () => {
    expect(closingHint(open5.window, "2026-10-19T20:00:00+05:30")).toEqual({ kind: "today" });
  });
  it("says nothing for a call with no deadline, a rolling one, one not yet open, or one that has closed", () => {
    for (const w of [
      openEnded.window,
      rolling.window,
      soon.window,
      tba.window,
      closedRecent.window,
    ])
      expect(closingHint(w, NOW)).toEqual({ kind: "none" });
  });
});
