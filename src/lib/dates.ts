/**
 * The only date helpers in the product (CLAUDE.md rule 11). Everything is IST (Asia/Kolkata, UTC+05:30, no DST).
 * Parsing and formatting avoid Intl month names so the output is identical on every Node/ICU version and browser.
 */

export const IST_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET = "+05:30";

const IST_OFFSET_MS = 330 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type DateInput = string | number | Date;

/** Epoch ms. A bare YYYY-MM-DD is read as the start of that day in IST; anything else must carry an offset. */
export function toMs(input: DateInput): number {
  const ms =
    typeof input === "number"
      ? input
      : input instanceof Date
        ? input.getTime()
        : ISO_DATE.test(input)
          ? startOfDayIST(input)
          : Date.parse(input);
  if (Number.isNaN(ms)) throw new RangeError(`dates: cannot parse "${String(input)}"`);
  return ms;
}

export function startOfDayIST(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00.000${IST_OFFSET}`);
}

export function endOfDayIST(isoDate: string): number {
  return Date.parse(`${isoDate}T23:59:59.999${IST_OFFSET}`);
}

interface IstParts {
  year: number;
  month: number; // 0-11
  day: number;
  hour: number;
  minute: number;
}

function istParts(ms: number): IstParts {
  const d = new Date(ms + IST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The IST calendar date of an instant, as YYYY-MM-DD. */
export function istDate(input: DateInput): string {
  const p = istParts(toMs(input));
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/** "12 Nov 2026". Deadlines and all public dates carry the year (SPEC §7). */
export function formatDate(input: DateInput): string {
  const p = istParts(toMs(input));
  return `${p.day} ${MONTHS[p.month]} ${p.year}`;
}

/** "12 NOV" style parts for a date chip. The year is included only when it is not the current IST year. */
export function formatDayMonth(
  input: DateInput,
  now: DateInput,
): { day: string; month: string; year: string | null } {
  const p = istParts(toMs(input));
  const currentYear = istParts(toMs(now)).year;
  return {
    day: pad(p.day),
    month: MONTHS[p.month]!.toUpperCase(),
    year: p.year === currentYear ? null : String(p.year),
  };
}

/** "4:30 pm IST" */
export function formatTime(input: DateInput): string {
  const { hour, minute } = istParts(toMs(input));
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(minute)} ${hour < 12 ? "am" : "pm"} IST`;
}

/** "23–27 Feb 2026", "28 Feb – 2 Mar 2026", "29 Dec 2025 – 3 Jan 2026". A missing or same-day end gives a single date. */
export function formatDateRange(start: DateInput, end?: DateInput): string {
  const a = istParts(toMs(start));
  if (end === undefined) return formatDate(start);
  const b = istParts(toMs(end));
  if (a.year === b.year && a.month === b.month && a.day === b.day) return formatDate(start);
  if (a.year === b.year && a.month === b.month)
    return `${a.day}–${b.day} ${MONTHS[b.month]} ${b.year}`;
  if (a.year === b.year)
    return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Whole days between two instants, rounded up (so "closes in 1 day" until it has closed). */
export function daysUntil(target: DateInput, now: DateInput): number {
  return Math.ceil((toMs(target) - toMs(now)) / DAY_MS);
}

// ── Calendar files (RFC 5545) and Google Calendar links ─────────────────────────────

/** "20261112T093000": the IST wall-clock time of an instant, as a calendar file writes `DTSTART;TZID=Asia/Kolkata`. */
export function icsLocalTime(input: DateInput): string {
  const p = istParts(toMs(input));
  return `${p.year}${pad(p.month + 1)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}00`;
}

/** "20261112": the IST calendar date of an instant, `plusDays` later, for all-day entries (their end date is exclusive). */
export function icsDay(input: DateInput, plusDays = 0): string {
  const p = istParts(toMs(input) + plusDays * DAY_MS);
  return `${p.year}${pad(p.month + 1)}${pad(p.day)}`;
}

/** "20261112T040000Z": an instant in UTC, the form Google Calendar links take. */
export function icsUtc(input: DateInput): string {
  return new Date(toMs(input))
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/** The instant in the visitor's own time zone, "12 Nov 2026, 10:00 am". Browser use only: the build has no visitor. */
export function formatLocalDateTime(input: DateInput): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    toMs(input),
  );
}

/**
 * True when the visitor's clock, at the time of the event, is not on India's UTC+05:30. Compared by offset, not by name:
 * a device in India may call its zone "Asia/Calcutta" or "Asia/Kolkata", and both are the same time.
 */
export function isOutsideIST(at: DateInput): boolean {
  return new Date(toMs(at)).getTimezoneOffset() !== -330;
}
