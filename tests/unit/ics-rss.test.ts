import { describe, expect, it } from "vitest";
import { icsDay, icsLocalTime, icsUtc, isOutsideIST } from "@/lib/dates";
import {
  escapeIcsText,
  eventIcs,
  foldLine,
  googleCalendarUrl,
  type CalendarEvent,
} from "@/lib/ics";
import { buildRss, escapeXml, FEED_LIMIT, rfc822 } from "@/lib/rss";

const stamp = new Date("2026-10-13T00:00:00Z");
const timed: CalendarEvent = {
  slug: "studio-2",
  title: "The Start-up Studio, Episode 2",
  summary: "Lab to market; a talk.",
  startsAt: "2026-11-12T16:30:00+05:30",
  endsAt: "2026-11-12T18:00:00+05:30",
  venue: { name: "Online" },
};
const allDay: CalendarEvent = {
  slug: "conclave",
  title: "Conclave",
  summary: "A day.",
  startsAt: "2026-08-08T00:00:00+05:30",
  endsAt: "2026-08-09T23:59:59+05:30",
  allDay: true,
};

describe("calendar date helpers", () => {
  it("writes IST wall time, a date and a UTC instant", () => {
    expect(icsLocalTime("2026-11-12T16:30:00+05:30")).toBe("20261112T163000");
    expect(icsDay("2026-12-31T10:00:00+05:30", 1)).toBe("20270101");
    expect(icsUtc("2026-11-12T16:30:00+05:30")).toBe("20261112T110000Z");
  });
});

describe("isOutsideIST", () => {
  // The zone of the test machine decides which of these holds, so each branch is checked against the machine's own offset.
  it("compares the offset at the time of the event, not the zone's name", () => {
    const offset = new Date("2099-03-10T10:00:00+05:30").getTimezoneOffset();
    expect(isOutsideIST("2099-03-10T10:00:00+05:30")).toBe(offset !== -330);
  });
});

describe("eventIcs", () => {
  it("writes a timed event in Asia/Kolkata with a time zone definition", () => {
    const text = eventIcs(timed, { url: "https://iice.iiserb.ac.in/events/studio-2/", stamp });
    expect(text.endsWith("\r\n")).toBe(true);
    expect(text).toContain("UID:studio-2@iice.iiserb.ac.in");
    expect(text).toContain("DTSTART;TZID=Asia/Kolkata:20261112T163000");
    expect(text).toContain("DTEND;TZID=Asia/Kolkata:20261112T180000");
    expect(text).toContain("DTSTAMP:20261013T000000Z");
    expect(text).toContain("BEGIN:VTIMEZONE");
    expect(text).toContain("SUMMARY:The Start-up Studio\\, Episode 2");
    expect(text).toContain("LOCATION:Online");
  });

  it("writes an all-day event with an exclusive end date and no time zone block", () => {
    const text = eventIcs(allDay, { url: "https://iice.iiserb.ac.in/events/conclave/", stamp });
    expect(text).toContain("DTSTART;VALUE=DATE:20260808");
    expect(text).toContain("DTEND;VALUE=DATE:20260810");
    expect(text).not.toContain("VTIMEZONE");
  });

  it("does not invent an end for a timed event that has none", () => {
    const open: CalendarEvent = { ...timed, endsAt: undefined };
    const text = eventIcs(open, { url: "https://x/", stamp });
    expect(text).not.toContain("DTEND");
  });

  it("keeps every line within 75 bytes and escapes text", () => {
    const text = eventIcs(
      { ...timed, summary: `${"word, ".repeat(40)}end;` },
      { url: "https://iice.iiserb.ac.in/events/studio-2/", stamp },
    );
    for (const line of text.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    // Unfolding gives back the escaped text.
    expect(text.replace(/\r\n /g, "")).toContain("word\\, word\\,");
  });
});

describe("text rules", () => {
  it("escapes backslash, semicolon, comma and newline", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
  it("folds without splitting a character", () => {
    const folded = foldLine(`X:${"é".repeat(60)}`);
    expect(folded.length).toBeGreaterThan(1);
    expect(folded.map((l) => l.replace(/^ /, "")).join("")).toBe(`X:${"é".repeat(60)}`);
  });
});

describe("googleCalendarUrl", () => {
  it("uses UTC instants for a timed event and dates for an all-day one", () => {
    const timedUrl = new URL(googleCalendarUrl(timed, "https://x/p/"));
    expect(timedUrl.hostname).toBe("calendar.google.com");
    expect(timedUrl.searchParams.get("dates")).toBe("20261112T110000Z/20261112T123000Z");
    expect(timedUrl.searchParams.get("text")).toBe(timed.title);
    expect(new URL(googleCalendarUrl(allDay, "https://x/p/")).searchParams.get("dates")).toBe(
      "20260808/20260810",
    );
  });
});

describe("buildRss", () => {
  const posts = Array.from({ length: 25 }, (_, i) => ({
    slug: `post-${i}`,
    title: i === 24 ? "Fish & <chips>" : `Post ${i}`,
    date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
    summary: "Summary",
    tags: i === 24 ? ["a&b"] : [],
  }));
  const site = { url: "https://iice.iiserb.ac.in", title: "IICE news", description: "News." };
  const xml = buildRss(posts, site, new Date("2026-10-13T00:00:00Z"));

  it("carries the latest 20 posts with absolute links", () => {
    expect(xml.match(/<item>/g)).toHaveLength(FEED_LIMIT);
    expect(xml).toContain("<link>https://iice.iiserb.ac.in/news/post-10/</link>");
    expect(xml).toContain(
      '<guid isPermaLink="true">https://iice.iiserb.ac.in/news/post-10/</guid>',
    );
    expect(xml).toContain('rel="self" type="application/rss+xml"');
  });

  it("lists newest first and escapes markup", () => {
    expect(xml.indexOf("post-24/")).toBeGreaterThan(-1);
    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) =>
      Date.parse(m[1] as string),
    );
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    expect(escapeXml("Fish & <chips>")).toBe("Fish &amp; &lt;chips&gt;");
    expect(xml).toContain("<category>a&amp;b</category>");
  });

  it("writes dates as RFC 822 in GMT", () => {
    expect(rfc822("2026-08-08")).toBe("Fri, 07 Aug 2026 18:30:00 GMT");
  });
});
