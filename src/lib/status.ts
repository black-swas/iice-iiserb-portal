/**
 * Status is computed, never stored (CLAUDE.md rule 12). Every function here is pure and takes `now`, so the build
 * and the client evaluate identically and can never disagree (TRD §4.3).
 */
import { DAY_MS, endOfDayIST, istDate, startOfDayIST, toMs, type DateInput } from "./dates";

export type WindowStatus = "upcoming" | "open" | "rolling" | "closed" | "tba";

export interface WindowLike {
  opensAt?: string | undefined;
  closesAt?: string | undefined;
  rolling?: boolean | undefined;
}

/**
 * `tba` is returned for a window that carries no dates and is not rolling. Reporting `open` or `upcoming` there
 * would assert something nobody has confirmed, so components show "To be announced" instead.
 * A closing date in the past always wins, so a malformed record can never display as open.
 */
export function windowStatus(window: WindowLike, now: DateInput): WindowStatus {
  const nowMs = toMs(now);
  const opens = window.opensAt === undefined ? undefined : toMs(window.opensAt);
  const closes = window.closesAt === undefined ? undefined : toMs(window.closesAt);

  if (closes !== undefined && nowMs >= closes) return "closed";
  if (opens !== undefined && nowMs < opens) return "upcoming";
  if (window.rolling) return "rolling";
  if (opens !== undefined || closes !== undefined) return "open";
  return "tba";
}

/** True while an application can be made: open with a deadline, open-ended, or rolling. */
export function isAcceptingApplications(status: WindowStatus): boolean {
  return status === "open" || status === "rolling";
}

/** Whole days until a window closes, or null when it has no closing date or has already closed. */
export function closesInDays(window: WindowLike, now: DateInput): number | null {
  if (window.closesAt === undefined) return null;
  const remaining = toMs(window.closesAt) - toMs(now);
  return remaining > 0 ? Math.ceil(remaining / DAY_MS) : null;
}

export type EventStatus = "upcoming" | "ongoing" | "past";

export interface EventLike {
  startsAt: string;
  endsAt?: string | undefined;
  allDay?: boolean | undefined;
}

function eventBounds(event: EventLike): { start: number; end: number } {
  const startDate = istDate(event.startsAt);
  if (event.allDay) {
    return {
      start: startOfDayIST(startDate),
      end: endOfDayIST(event.endsAt ? istDate(event.endsAt) : startDate),
    };
  }
  // With no end time an event is treated as running until the end of its IST day. Guessing a duration would be inventing one.
  return {
    start: toMs(event.startsAt),
    end: event.endsAt ? toMs(event.endsAt) : endOfDayIST(startDate),
  };
}

export function eventStatus(event: EventLike, now: DateInput): EventStatus {
  const nowMs = toMs(now);
  const { start, end } = eventBounds(event);
  if (nowMs < start) return "upcoming";
  return nowMs <= end ? "ongoing" : "past";
}

/** Registration is offered only before the event starts and before its own closing time, whichever is earlier. */
export function registrationOpen(
  event: EventLike & { registration?: { closesAt?: string | undefined } | undefined },
  now: DateInput,
): boolean {
  if (!event.registration) return false;
  const nowMs = toMs(now);
  const { start } = eventBounds(event);
  const closes =
    event.registration.closesAt === undefined ? Infinity : toMs(event.registration.closesAt);
  return nowMs < Math.min(start, closes);
}

/** Announcements are live from `startsAt` up to, but not including, `expiresAt`. */
export function isAnnouncementLive(
  announcement: { startsAt: string; expiresAt: string },
  now: DateInput,
): boolean {
  const nowMs = toMs(now);
  return nowMs >= toMs(announcement.startsAt) && nowMs < toMs(announcement.expiresAt);
}

/** Jobs run from the start of `postedAt` to the end of `closesAt`, both IST calendar days. */
export function isJobOpen(job: { postedAt: string; closesAt: string }, now: DateInput): boolean {
  const nowMs = toMs(now);
  return nowMs >= startOfDayIST(job.postedAt) && nowMs <= endOfDayIST(job.closesAt);
}
