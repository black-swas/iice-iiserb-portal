/**
 * Calendar files and links for events (BACKEND_SCHEMA §7, SPEC §4.4). Pure and shared by the page, which offers the
 * "Add to calendar" links, and scripts/ics.ts, which writes `public/events/{slug}.ics`.
 * Times are IST (`TZID=Asia/Kolkata`). An event with no end time gets no end: guessing a duration would be inventing one.
 */
import { icsDay, icsLocalTime, icsUtc, istDate } from "./dates";

export interface CalendarEvent {
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt?: string | undefined;
  allDay?: boolean | undefined;
  venue?: { name: string; address?: string | undefined } | undefined;
}

export const CALENDAR_DOMAIN = "iice.iiserb.ac.in";

const TIMEZONE_BLOCK = [
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Kolkata",
  "BEGIN:STANDARD",
  "DTSTART:19450101T000000",
  "TZOFFSETFROM:+0530",
  "TZOFFSETTO:+0530",
  "TZNAME:IST",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Escapes text per RFC 5545 §3.3.11. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets, continuing with a space (RFC 5545 §3.1), without splitting a character. */
export function foldLine(line: string): string[] {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  if (bytes(line) <= 75) return [line];
  const out: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes(current + char) > limit) {
      out.push(out.length === 0 ? current : ` ${current}`);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) out.push(out.length === 0 ? current : ` ${current}`);
  return out;
}

/** The place line: "Venue name, address", or nothing. */
export function locationOf(event: CalendarEvent): string | undefined {
  if (!event.venue) return undefined;
  return [event.venue.name, event.venue.address].filter(Boolean).join(", ");
}

/** Start and end as a calendar file or link needs them. All-day events use dates and an exclusive end. */
function span(event: CalendarEvent) {
  if (event.allDay) {
    const last = event.endsAt ? istDate(event.endsAt) : istDate(event.startsAt);
    return {
      allDay: true as const,
      start: icsDay(event.startsAt),
      end: icsDay(`${last}T00:00:00+05:30`, 1),
    };
  }
  return {
    allDay: false as const,
    start: icsLocalTime(event.startsAt),
    end: event.endsAt ? icsLocalTime(event.endsAt) : undefined,
    startUtc: icsUtc(event.startsAt),
    endUtc: event.endsAt ? icsUtc(event.endsAt) : undefined,
  };
}

/** A complete VCALENDAR with one VEVENT. `stamp` is the generation time, passed in so the output is reproducible. */
export function eventIcs(event: CalendarEvent, options: { url: string; stamp: Date }): string {
  const range = span(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IICE IISER Bhopal//Website//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(range.allDay ? [] : TIMEZONE_BLOCK),
    "BEGIN:VEVENT",
    `UID:${event.slug}@${CALENDAR_DOMAIN}`,
    `DTSTAMP:${icsUtc(options.stamp)}`,
    range.allDay ? `DTSTART;VALUE=DATE:${range.start}` : `DTSTART;TZID=Asia/Kolkata:${range.start}`,
    ...(range.allDay
      ? [`DTEND;VALUE=DATE:${range.end}`]
      : range.end
        ? [`DTEND;TZID=Asia/Kolkata:${range.end}`]
        : []),
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(locationOf(event) ? [`LOCATION:${escapeIcsText(locationOf(event) as string)}`] : []),
    `DESCRIPTION:${escapeIcsText(`${event.summary}\n${options.url}`)}`,
    `URL:${options.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}

/** A "create this event" link for Google Calendar. */
export function googleCalendarUrl(event: CalendarEvent, pageUrl: string): string {
  const range = span(event);
  const dates = range.allDay
    ? `${range.start}/${range.end}`
    : `${range.startUtc}/${range.endUtc ?? range.startUtc}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: `${event.summary}\n${pageUrl}`,
    ...(locationOf(event) ? { location: locationOf(event) as string } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
