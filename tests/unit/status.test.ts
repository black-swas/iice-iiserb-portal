import { describe, expect, it } from "vitest";
import {
  closesInDays,
  eventStatus,
  isAcceptingApplications,
  isAnnouncementLive,
  isJobOpen,
  registrationOpen,
  windowStatus,
} from "@/lib/status";

const at = (s: string) => `${s}+05:30`;
const NOW = at("2026-10-13T12:00:00");

describe("windowStatus", () => {
  it("is open between opening and closing", () => {
    expect(
      windowStatus(
        { opensAt: at("2026-10-01T00:00:00"), closesAt: at("2026-11-30T23:59:59") },
        NOW,
      ),
    ).toBe("open");
  });

  it("is upcoming before it opens", () => {
    expect(
      windowStatus(
        { opensAt: at("2026-11-01T00:00:00"), closesAt: at("2026-12-01T00:00:00") },
        NOW,
      ),
    ).toBe("upcoming");
  });

  it("closes at the closing instant, not after it", () => {
    const w = { closesAt: at("2026-10-13T12:00:00") };
    expect(windowStatus(w, at("2026-10-13T11:59:59.999"))).toBe("open");
    expect(windowStatus(w, NOW)).toBe("closed");
  });

  it("is rolling when flagged and not waiting to open", () => {
    expect(windowStatus({ rolling: true }, NOW)).toBe("rolling");
    expect(windowStatus({ rolling: true, opensAt: at("2026-12-01T00:00:00") }, NOW)).toBe(
      "upcoming",
    );
  });

  it("stays open with an opening date and no closing date", () => {
    expect(windowStatus({ opensAt: at("2026-10-01T00:00:00") }, NOW)).toBe("open");
  });

  it("is tba when nothing is known, rather than claiming open or upcoming", () => {
    expect(windowStatus({}, NOW)).toBe("tba");
    expect(windowStatus({ rolling: false }, NOW)).toBe("tba");
  });

  it("lets a past closing date win, so malformed data can never show open", () => {
    expect(windowStatus({ rolling: true, closesAt: at("2026-01-01T00:00:00") }, NOW)).toBe(
      "closed",
    );
  });

  it("gives the same answer for a Date, a number and a string", () => {
    const w = { closesAt: at("2026-11-30T23:59:59") };
    expect(windowStatus(w, new Date(NOW))).toBe(windowStatus(w, Date.parse(NOW)));
  });
});

describe("isAcceptingApplications", () => {
  it("is true only for open and rolling", () => {
    expect(
      ["open", "rolling", "upcoming", "closed", "tba"].map((s) =>
        isAcceptingApplications(s as never),
      ),
    ).toEqual([true, true, false, false, false]);
  });
});

describe("closesInDays", () => {
  it("counts days to the deadline", () => {
    expect(closesInDays({ closesAt: at("2026-10-22T12:00:00") }, NOW)).toBe(9);
  });

  it("is null with no deadline or once closed", () => {
    expect(closesInDays({ rolling: true }, NOW)).toBeNull();
    expect(closesInDays({ closesAt: at("2026-10-01T00:00:00") }, NOW)).toBeNull();
  });
});

describe("eventStatus", () => {
  const timed = { startsAt: at("2026-10-20T10:00:00"), endsAt: at("2026-10-20T17:00:00") };

  it("moves from upcoming to ongoing to past", () => {
    expect(eventStatus(timed, at("2026-10-20T09:59:59"))).toBe("upcoming");
    expect(eventStatus(timed, at("2026-10-20T10:00:00"))).toBe("ongoing");
    expect(eventStatus(timed, at("2026-10-20T17:00:00"))).toBe("ongoing");
    expect(eventStatus(timed, at("2026-10-20T17:00:01"))).toBe("past");
  });

  it("treats a timed event with no end as running to the end of its IST day", () => {
    const webinar = { startsAt: at("2023-03-29T16:30:00") };
    expect(eventStatus(webinar, at("2023-03-29T16:29:00"))).toBe("upcoming");
    expect(eventStatus(webinar, at("2023-03-29T21:00:00"))).toBe("ongoing");
    expect(eventStatus(webinar, at("2023-03-30T00:00:00"))).toBe("past");
  });

  it("treats an all-day event as the whole IST day", () => {
    const day = { startsAt: at("2026-05-07T00:00:00"), allDay: true };
    expect(eventStatus(day, at("2026-05-06T23:59:59"))).toBe("upcoming");
    expect(eventStatus(day, at("2026-05-07T00:00:00"))).toBe("ongoing");
    expect(eventStatus(day, at("2026-05-07T23:59:59.999"))).toBe("ongoing");
    expect(eventStatus(day, at("2026-05-08T00:00:00"))).toBe("past");
  });

  it("ignores the time of day on all-day events, so a late-evening start does not skip the day", () => {
    const day = { startsAt: at("2026-05-07T20:00:00"), allDay: true };
    expect(eventStatus(day, at("2026-05-07T08:00:00"))).toBe("ongoing");
  });

  it("spans a multi-day all-day event inclusively", () => {
    const week = {
      startsAt: at("2026-02-23T00:00:00"),
      endsAt: at("2026-02-27T23:59:59"),
      allDay: true,
    };
    expect(eventStatus(week, at("2026-02-25T12:00:00"))).toBe("ongoing");
    expect(eventStatus(week, at("2026-02-27T23:00:00"))).toBe("ongoing");
    expect(eventStatus(week, at("2026-02-28T00:00:00"))).toBe("past");
  });

  it("uses the IST day for an instant that is the previous day in UTC", () => {
    const day = { startsAt: at("2026-05-07T00:00:00"), allDay: true };
    expect(eventStatus(day, "2026-05-06T19:00:00Z")).toBe("ongoing"); // 00:30 IST on the 7th
  });
});

describe("registrationOpen", () => {
  const event = { startsAt: at("2026-10-20T10:00:00") };

  it("is closed without a registration", () => {
    expect(registrationOpen(event, NOW)).toBe(false);
  });

  it("is open before the event starts when nothing closes it earlier", () => {
    expect(registrationOpen({ ...event, registration: {} }, NOW)).toBe(true);
  });

  it("closes at the registration deadline", () => {
    const e = { ...event, registration: { closesAt: at("2026-10-15T00:00:00") } };
    expect(registrationOpen(e, at("2026-10-14T23:59:59"))).toBe(true);
    expect(registrationOpen(e, at("2026-10-15T00:00:00"))).toBe(false);
  });

  it("closes when the event starts even if the deadline is later", () => {
    const e = { ...event, registration: { closesAt: at("2026-10-25T00:00:00") } };
    expect(registrationOpen(e, at("2026-10-20T10:00:00"))).toBe(false);
  });
});

describe("isAnnouncementLive", () => {
  const a = { startsAt: at("2026-10-10T00:00:00"), expiresAt: at("2026-10-20T00:00:00") };

  it("is live from the start up to, not including, the expiry", () => {
    expect(isAnnouncementLive(a, at("2026-10-09T23:59:59"))).toBe(false);
    expect(isAnnouncementLive(a, at("2026-10-10T00:00:00"))).toBe(true);
    expect(isAnnouncementLive(a, at("2026-10-19T23:59:59"))).toBe(true);
    expect(isAnnouncementLive(a, at("2026-10-20T00:00:00"))).toBe(false);
  });
});

describe("isJobOpen", () => {
  const job = { postedAt: "2026-10-01", closesAt: "2026-10-31" };

  it("runs from the start of the posting day to the end of the closing day, in IST", () => {
    expect(isJobOpen(job, at("2026-09-30T23:59:59"))).toBe(false);
    expect(isJobOpen(job, at("2026-10-01T00:00:00"))).toBe(true);
    expect(isJobOpen(job, at("2026-10-31T23:59:59"))).toBe(true);
    expect(isJobOpen(job, at("2026-11-01T00:00:00"))).toBe(false);
  });
});
