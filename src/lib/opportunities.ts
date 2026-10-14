/**
 * Open calls (SPEC §4.1c): which tab a call belongs on and the order within it. Built on windowStatus(), so the build and the
 * visitor's browser agree, and nothing is stored: a call is "open" or "past" only by its dates at the moment of looking.
 */
import { toMs, type DateInput } from "./dates";
import { closesInDays, windowStatus, type WindowLike } from "./status";

export type Tab = "open" | "past";

export interface CallLike {
  window: WindowLike;
}

/**
 * Open calls (a deadline, open-ended or rolling) and calls that have not opened yet or have no dates share the "open" tab:
 * they are all calls a visitor may still act on. Only a call whose window has closed is "past".
 */
export function tabOf(call: CallLike, now: DateInput): Tab {
  return windowStatus(call.window, now) === "closed" ? "past" : "open";
}

const RANK = { open: 0, rolling: 2, upcoming: 3, tba: 4, closed: 5 } as const;

/**
 * Soonest deadline first, then calls with no deadline, then rolling calls (they never run out, so they come last among
 * the open ones), then calls not yet open by their opening date, then calls with no dates at all.
 * Past calls are the other way round: the most recently closed first.
 */
export function sortCalls<T extends CallLike>(calls: readonly T[], now: DateInput): T[] {
  const key = (call: T): [number, number] => {
    const status = windowStatus(call.window, now);
    if (status === "open")
      return [call.window.closesAt ? 0 : 1, call.window.closesAt ? toMs(call.window.closesAt) : 0];
    if (status === "upcoming")
      return [RANK.upcoming, call.window.opensAt ? toMs(call.window.opensAt) : 0];
    if (status === "closed") return [RANK.closed, -toMs(call.window.closesAt ?? 0)];
    return [RANK[status], 0];
  };
  return [...calls].sort((a, b) => {
    const [ra, ta] = key(a);
    const [rb, tb] = key(b);
    return ra - rb || ta - tb;
  });
}

export type Hint = { kind: "none" } | { kind: "today" } | { kind: "days"; days: number };

/** The relative hint beside a deadline: "closes within a day", "closes in 9 days". Only for a call that is open with a deadline. */
export function closingHint(window: WindowLike, now: DateInput): Hint {
  if (windowStatus(window, now) !== "open") return { kind: "none" };
  const days = closesInDays(window, now);
  if (days === null) return { kind: "none" };
  return days <= 1 ? { kind: "today" } : { kind: "days", days };
}
