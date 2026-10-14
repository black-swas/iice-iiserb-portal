import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { liveAnnouncements } from "@/lib/announcements";
import { intakeState, type IntakeOpportunity } from "@/lib/intake";
import { THEME_SCRIPT, isDark, nextTheme, parseTheme } from "@/lib/theme";

const at = (s: string) => `${s}+05:30`;
const NOW = at("2026-10-13T12:00:00");

describe("THEME_SCRIPT (runs in <head> before paint)", () => {
  /** Runs the real script in a sandbox with fake storage and a fake system preference; returns the final `dark` state. */
  function run({
    stored,
    systemDark,
    storageThrows = false,
  }: {
    stored?: string;
    systemDark: boolean;
    storageThrows?: boolean;
  }) {
    let dark: boolean | undefined;
    const sandbox = {
      localStorage: {
        getItem: (key: string) => {
          if (storageThrows) throw new Error("blocked");
          return key === "theme" ? (stored ?? null) : null;
        },
      },
      matchMedia: () => ({ matches: systemDark }),
      document: {
        documentElement: {
          classList: { toggle: (_name: string, force: boolean) => void (dark = force) },
        },
      },
    };
    vm.runInNewContext(THEME_SCRIPT, sandbox);
    return dark;
  }

  it("fits the 500-byte budget the CSP hash relies on, and cannot close its own script tag", () => {
    expect(Buffer.byteLength(THEME_SCRIPT)).toBeLessThan(500);
    expect(THEME_SCRIPT.toLowerCase()).not.toContain("</script");
  });

  it("follows the system when nothing is stored", () => {
    expect(run({ systemDark: true })).toBe(true);
    expect(run({ systemDark: false })).toBe(false);
  });

  it("lets a stored choice beat the system either way", () => {
    expect(run({ stored: "dark", systemDark: false })).toBe(true);
    expect(run({ stored: "light", systemDark: true })).toBe(false);
  });

  it("treats an unknown stored value as system", () => {
    expect(run({ stored: "blue", systemDark: true })).toBe(true);
  });

  it("does not throw when storage is blocked, and leaves the page alone", () => {
    expect(() => run({ systemDark: true, storageThrows: true })).not.toThrow();
    expect(run({ systemDark: true, storageThrows: true })).toBeUndefined();
  });
});

describe("theme helpers", () => {
  it("cycles system, light, dark and round again", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });

  it("decides dark from the choice and the system preference", () => {
    expect(isDark("dark", false)).toBe(true);
    expect(isDark("light", true)).toBe(false);
    expect(isDark("system", true)).toBe(true);
    expect(isDark("system", false)).toBe(false);
  });

  it("reads a stored value, defaulting anything else to system", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("")).toBe("system");
    expect(parseTheme("auto")).toBe("system");
  });
});

describe("liveAnnouncements", () => {
  const item = (id: string, startsAt: string, expiresAt: string, priority = 5) => ({
    id,
    startsAt: at(startsAt),
    expiresAt: at(expiresAt),
    priority,
  });
  const list = [
    item("expired", "2026-09-01T00:00:00", "2026-10-01T00:00:00"),
    item("future", "2026-11-01T00:00:00", "2026-12-01T00:00:00"),
    item("older", "2026-10-01T00:00:00", "2026-11-01T00:00:00"),
    item("newer", "2026-10-10T00:00:00", "2026-11-01T00:00:00"),
    item("urgent", "2026-10-05T00:00:00", "2026-10-20T00:00:00", 9),
  ];

  it("keeps only the live ones, never an expired or not-yet-started one", () => {
    expect(liveAnnouncements(list, NOW).map((a) => a.id)).toEqual(["urgent", "newer", "older"]);
  });

  it("orders by priority, then by how recently each started", () => {
    const ids = liveAnnouncements(list, NOW).map((a) => a.id);
    expect(ids[0]).toBe("urgent");
    expect(ids.indexOf("newer")).toBeLessThan(ids.indexOf("older"));
  });

  it("drops an announcement the moment it expires, so a stale build is corrected on the client", () => {
    expect(liveAnnouncements(list, at("2026-10-20T00:00:00")).map((a) => a.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("is empty when nothing is live, and does not change its input", () => {
    const copy = [...list];
    expect(liveAnnouncements([], NOW)).toEqual([]);
    liveAnnouncements(list, NOW);
    expect(list).toEqual(copy);
  });
});

describe("intakeState", () => {
  const opp = (
    slug: string,
    window: IntakeOpportunity["window"],
    headline = true,
  ): IntakeOpportunity => ({ slug, window, headline });
  const closes = (s: string) => ({ opensAt: at("2026-09-01T00:00:00"), closesAt: at(s) });

  it("says to be announced when there is nothing to say", () => {
    expect(intakeState([], undefined, NOW)).toEqual({ kind: "tba" });
    expect(intakeState([opp("x", {}, false)], undefined, NOW)).toEqual({ kind: "tba" });
  });

  it("reports an open call with its closing instant", () => {
    expect(intakeState([opp("a", closes("2026-11-30T23:59:59"))], undefined, NOW)).toEqual({
      kind: "open",
      closesAt: at("2026-11-30T23:59:59"),
    });
  });

  it("reports rolling, and open-ended when there is an opening date but no deadline", () => {
    expect(intakeState([opp("a", { rolling: true })], undefined, NOW)).toEqual({ kind: "rolling" });
    expect(intakeState([opp("a", { opensAt: at("2026-10-01T00:00:00") })], undefined, NOW)).toEqual(
      { kind: "openEnded" },
    );
  });

  it("reports a call that has not opened, with its opening instant", () => {
    expect(
      intakeState(
        [opp("a", { opensAt: at("2026-12-01T00:00:00"), closesAt: at("2027-01-01T00:00:00") })],
        undefined,
        NOW,
      ),
    ).toEqual({
      kind: "upcoming",
      opensAt: at("2026-12-01T00:00:00"),
    });
  });

  it("never claims an intake that has closed", () => {
    expect(intakeState([opp("a", closes("2026-10-01T00:00:00"))], undefined, NOW)).toEqual({
      kind: "tba",
    });
  });

  it("prefers open over rolling over upcoming, and the soonest deadline among the open", () => {
    const state = intakeState(
      [
        opp("soon", closes("2026-10-20T00:00:00")),
        opp("later", closes("2026-12-20T00:00:00")),
        opp("rolling", { rolling: true }),
        opp("upcoming", { opensAt: at("2026-11-01T00:00:00") }),
      ],
      undefined,
      NOW,
    );
    expect(state).toEqual({ kind: "open", closesAt: at("2026-10-20T00:00:00") });
    expect(
      intakeState(
        [opp("u", { opensAt: at("2026-11-01T00:00:00") }), opp("r", { rolling: true })],
        undefined,
        NOW,
      ),
    ).toEqual({ kind: "rolling" });
  });

  it("ignores opportunities not flagged headline, unless a site setting names one", () => {
    const quiet = opp("quiet", closes("2026-11-30T00:00:00"), false);
    expect(intakeState([quiet], undefined, NOW)).toEqual({ kind: "tba" });
    expect(intakeState([quiet], "quiet", NOW)).toEqual({
      kind: "open",
      closesAt: at("2026-11-30T00:00:00"),
    });
  });

  it("uses only the named opportunity when a site setting names one", () => {
    const list = [
      opp("named", closes("2026-12-31T00:00:00")),
      opp("other", closes("2026-10-20T00:00:00")),
    ];
    expect(intakeState(list, "named", NOW)).toEqual({
      kind: "open",
      closesAt: at("2026-12-31T00:00:00"),
    });
    expect(intakeState(list, "missing", NOW)).toEqual({ kind: "tba" });
  });
});
